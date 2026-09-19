import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { clearData, createUser } from '../test/helpers.js';

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('POST /api/interviews (scheduling)', () => {
  let adminToken;
  let interviewer;

  beforeEach(async () => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
    adminToken = await loginAs('admin@test.com', 'admin123');
    interviewer = createUser({
      name: 'Interviewer',
      email: 'interviewer@test.com',
      password: 'pw123456',
      role: 'interviewer',
    });
  });

  async function createCandidate(status) {
    const res = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Candidate',
        email: `${status.toLowerCase().replace(' ', '-')}@test.com`,
        phone: '555-0000',
        position: 'Engineer',
        status,
      });
    return res.body;
  }

  async function schedule(candidateId) {
    return request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId,
        interviewerIds: [interviewer.id],
        date: new Date('2026-01-15T10:00:00.000Z').toISOString(),
        durationMinutes: 30,
        type: 'Phone',
      });
  }

  it('moves an Applied candidate to Interview Scheduled', async () => {
    const candidate = await createCandidate('Applied');
    const res = await schedule(candidate.id);
    expect(res.status).toBe(201);
    expect(res.body.candidate.status).toBe('Interview Scheduled');
    expect(res.body.interview.status).toBe('Scheduled');
  });

  it('moves a Screening candidate to Interview Scheduled', async () => {
    const candidate = await createCandidate('Screening');
    const res = await schedule(candidate.id);
    expect(res.body.candidate.status).toBe('Interview Scheduled');
  });

  it('does not move an Offer candidate backward', async () => {
    const candidate = await createCandidate('Offer');
    const res = await schedule(candidate.id);
    expect(res.body.candidate.status).toBe('Offer');
  });

  it('does not move a Rejected candidate backward', async () => {
    const candidate = await createCandidate('Rejected');
    const res = await schedule(candidate.id);
    expect(res.body.candidate.status).toBe('Rejected');
  });

  it('links the assigned interviewer to the created interview', async () => {
    const candidate = await createCandidate('Applied');
    const res = await schedule(candidate.id);
    expect(res.body.interview.interviewerIds).toEqual([interviewer.id]);
  });

  it('rejects scheduling for a candidate that does not exist', async () => {
    const res = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId: 'does-not-exist',
        interviewerIds: [interviewer.id],
        date: new Date().toISOString(),
        durationMinutes: 30,
        type: 'Phone',
      });
    expect(res.status).toBe(404);
  });

  it('rejects scheduling with no interviewers', async () => {
    const candidate = await createCandidate('Applied');
    const res = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId: candidate.id,
        interviewerIds: [],
        date: new Date().toISOString(),
        durationMinutes: 30,
        type: 'Phone',
      });
    expect(res.status).toBe(400);
  });
});

describe('interview lifecycle guards', () => {
  let adminToken;
  let interviewer;
  let interviewId;

  beforeEach(async () => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
    adminToken = await loginAs('admin@test.com', 'admin123');
    interviewer = createUser({
      name: 'Interviewer',
      email: 'interviewer@test.com',
      password: 'pw123456',
      role: 'interviewer',
    });
    const candidate = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Candidate', email: 'cand@test.com', phone: '555-0000', position: 'Engineer', status: 'Applied' });
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
    interviewId = interview.body.interview.id;
  });

  it('cannot cancel an interview twice', async () => {
    await request(app)
      .post(`/api/interviews/${interviewId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const res = await request(app)
      .post(`/api/interviews/${interviewId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it('cannot send a reminder for a cancelled interview', async () => {
    await request(app)
      .post(`/api/interviews/${interviewId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const res = await request(app)
      .post(`/api/interviews/${interviewId}/notify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(409);
  });
});
