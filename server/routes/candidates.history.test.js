import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { clearData, createUser } from '../test/helpers.js';

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('GET /api/candidates/:id/history', () => {
  let adminToken;
  let outsiderToken;
  let candidateId;

  beforeAll(async () => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
    createUser({ name: 'Outsider', email: 'out@test.com', password: 'pw123456', role: 'interviewer' });
    adminToken = await loginAs('admin@test.com', 'admin123');
    outsiderToken = await loginAs('out@test.com', 'pw123456');

    const created = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Hist Ory', email: 'hist@test.com', phone: '555', position: 'Engineer', status: 'Applied' });
    candidateId = created.body.id;
  });

  it('lists status changes oldest first with from/to and who made them', async () => {
    for (const status of ['Screening', 'Rejected']) {
      await request(app)
        .patch(`/api/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status });
    }

    const res = await request(app)
      .get(`/api/candidates/${candidateId}/history`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.map((c) => [c.from, c.to, c.actorName])).toEqual([
      ['Applied', 'Screening', 'Admin'],
      ['Screening', 'Rejected', 'Admin'],
    ]);
  });

  it('refuses interviewers who are not assigned to the candidate', async () => {
    const res = await request(app)
      .get(`/api/candidates/${candidateId}/history`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(res.status).toBe(403);
  });

  it('404s for an unknown candidate', async () => {
    const res = await request(app)
      .get('/api/candidates/nope/history')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
