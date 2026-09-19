import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { clearData, createUser } from '../test/helpers.js';

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

const candidatePayload = (overrides = {}) => ({
  name: 'Test Candidate',
  email: 'candidate@test.com',
  phone: '555-0000',
  position: 'Engineer',
  status: 'Applied',
  ...overrides,
});

describe('candidates routes', () => {
  let adminToken;

  beforeEach(async () => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
    adminToken = await loginAs('admin@test.com', 'admin123');
  });

  it('rejects a duplicate email on create', async () => {
    await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(candidatePayload())
      .expect(201);

    const res = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(candidatePayload({ name: 'Another Name' }));
    expect(res.status).toBe(409);
  });

  it('rejects renaming a candidate to another candidate\'s email', async () => {
    const a = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(candidatePayload({ email: 'a@test.com' }));
    await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(candidatePayload({ email: 'b@test.com' }));

    const res = await request(app)
      .patch(`/api/candidates/${a.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'b@test.com' });
    expect(res.status).toBe(409);
  });

  it('allows a PATCH that keeps the same email', async () => {
    const a = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(candidatePayload({ email: 'same@test.com' }));

    const res = await request(app)
      .patch(`/api/candidates/${a.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'same@test.com', notes: 'updated' });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('updated');
  });

  it('cascades interview deletion when a candidate is deleted', async () => {
    const interviewer = createUser({
      name: 'Interviewer',
      email: 'interviewer@test.com',
      password: 'pw123456',
      role: 'interviewer',
    });
    const candidate = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(candidatePayload());
    const interview = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId: candidate.body.id,
        interviewerIds: [interviewer.id],
        date: new Date().toISOString(),
        durationMinutes: 30,
        type: 'Phone',
      });
    expect(interview.status).toBe(201);

    const del = await request(app)
      .delete(`/api/candidates/${candidate.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(204);

    const list = await request(app).get('/api/interviews').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.find((i) => i.id === interview.body.interview.id)).toBeUndefined();
  });

  it('returns 404 deleting a candidate that does not exist', async () => {
    const res = await request(app)
      .delete('/api/candidates/does-not-exist')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('forbids a non-admin from creating a candidate', async () => {
    createUser({ name: 'Interviewer', email: 'interviewer2@test.com', password: 'pw123456', role: 'interviewer' });
    const token = await loginAs('interviewer2@test.com', 'pw123456');

    const res = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send(candidatePayload({ email: 'blocked@test.com' }));
    expect(res.status).toBe(403);
  });
});
