import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { clearData, createUser } from '../test/helpers.js';

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
  });

  it('returns a session token for correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('admin@test.com');
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('rejects an incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'admin123' });
    expect(res.status).toBe(401);
  });

  it('rejects a request missing email or password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/users/me/password', () => {
  let token;

  beforeEach(async () => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    token = login.body.token;
  });

  it('rejects the wrong current password', async () => {
    const res = await request(app)
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong', newPassword: 'newpassword123' });
    expect(res.status).toBe(401);
  });

  it('rejects a new password shorter than 8 characters', async () => {
    const res = await request(app)
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin123', newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('changes the password and allows login with the new one', async () => {
    const change = await request(app)
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin123', newPassword: 'newpassword123' });
    expect(change.status).toBe(204);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'newpassword123' });
    expect(newLogin.status).toBe(200);
  });
});
