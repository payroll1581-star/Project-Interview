import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { clearData, createUser } from '../test/helpers.js';

async function login(email, password) {
  return request(app).post('/api/auth/login').send({ email, password });
}

describe('session revocation', () => {
  beforeEach(() => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
  });

  it("self-service: DELETE /api/auth/sessions ends all of the caller's sessions", async () => {
    const login1 = await login('admin@test.com', 'admin123');
    const login2 = await login('admin@test.com', 'admin123');

    const revoke = await request(app)
      .delete('/api/auth/sessions')
      .set('Authorization', `Bearer ${login1.body.token}`);
    expect(revoke.status).toBe(204);

    const check1 = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login1.body.token}`);
    expect(check1.status).toBe(401);
    const check2 = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login2.body.token}`);
    expect(check2.status).toBe(401);
  });

  it("admin can revoke a specific user's sessions without affecting their own", async () => {
    const adminLogin = await login('admin@test.com', 'admin123');
    const interviewer = createUser({ name: 'Int', email: 'int@test.com', password: 'pw123456', role: 'interviewer' });
    const intLogin = await login('int@test.com', 'pw123456');

    const revoke = await request(app)
      .delete(`/api/users/${interviewer.id}/sessions`)
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(revoke.status).toBe(204);

    const intCheck = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${intLogin.body.token}`);
    expect(intCheck.status).toBe(401);
    const adminCheck = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(adminCheck.status).toBe(200);
  });

  it("forbids a non-admin from revoking another user's sessions", async () => {
    const interviewer = createUser({ name: 'Int', email: 'int2@test.com', password: 'pw123456', role: 'interviewer' });
    const intLogin = await login('int2@test.com', 'pw123456');

    const res = await request(app)
      .delete(`/api/users/${interviewer.id}/sessions`)
      .set('Authorization', `Bearer ${intLogin.body.token}`);
    expect(res.status).toBe(403);
  });

  it('404s revoking sessions for a user that does not exist', async () => {
    const adminLogin = await login('admin@test.com', 'admin123');
    const res = await request(app)
      .delete('/api/users/does-not-exist/sessions')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    expect(res.status).toBe(404);
  });
});
