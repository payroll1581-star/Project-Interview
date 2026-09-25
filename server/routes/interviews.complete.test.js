import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { db } from '../db.js';
import { clearData, clearCandidatesAndInterviews, createUser } from '../test/helpers.js';

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('POST /api/interviews/:id/complete (candidate status)', () => {
  let adminToken;
  let interviewer;
  let interviewerToken;
  let scores;

  // Log in once: the login rate limiter is shared module state, so per-test logins would trip it.
  beforeAll(async () => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
    adminToken = await loginAs('admin@test.com', 'admin123');
    interviewer = createUser({
      name: 'Interviewer',
      email: 'interviewer@test.com',
      password: 'pw123456',
      role: 'interviewer',
    });
    interviewerToken = await loginAs('interviewer@test.com', 'pw123456');
  });

  beforeEach(() => {
    clearCandidatesAndInterviews();
    scores = db
      .prepare('SELECT id FROM evaluation_criteria LIMIT 3')
      .all()
      .map((c) => ({ criterionId: c.id, score: 4 }));
  });

  async function createCandidate(status) {
    const res = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Candidate', email: 'cand@test.com', phone: '555-0000', position: 'Engineer', status });
    return res.body;
  }

  async function schedule(candidateId) {
    const res = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId,
        interviewerIds: [interviewer.id],
        date: new Date('2026-01-15T10:00:00.000Z').toISOString(),
        durationMinutes: 30,
        type: 'Phone',
      });
    return res.body;
  }

  function complete(interviewId, token = interviewerToken) {
    return request(app)
      .post(`/api/interviews/${interviewId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ evaluation: { scores } });
  }

  it('moves the candidate to Interviewed when the only pending interview is completed', async () => {
    const candidate = await createCandidate('Applied');
    const { interview } = await schedule(candidate.id);

    const res = await complete(interview.id);

    expect(res.status).toBe(200);
    expect(res.body.interview.status).toBe('Completed');
    expect(res.body.candidate.status).toBe('Interviewed');

    const list = await request(app)
      .get('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.find((c) => c.id === candidate.id).status).toBe('Interviewed');
  });

  it('keeps Interview Scheduled while another interview is still pending', async () => {
    const candidate = await createCandidate('Applied');
    const first = await schedule(candidate.id);
    await schedule(candidate.id);

    const res = await complete(first.interview.id);

    expect(res.status).toBe(200);
    expect(res.body.candidate.status).toBe('Interview Scheduled');
  });

  it('does not move an Offer candidate', async () => {
    const candidate = await createCandidate('Offer');
    const { interview } = await schedule(candidate.id);

    const res = await complete(interview.id);

    expect(res.body.candidate.status).toBe('Offer');
  });

  it('moves the candidate to Interviewed when cancelling the last pending interview after one was completed', async () => {
    const candidate = await createCandidate('Applied');
    const first = await schedule(candidate.id);
    const second = await schedule(candidate.id);
    await complete(first.interview.id);

    const res = await request(app)
      .post(`/api/interviews/${second.interview.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.interview.status).toBe('Cancelled');
    expect(res.body.candidate.status).toBe('Interviewed');
  });

  it('keeps Interview Scheduled when cancelling leaves no completed interview', async () => {
    const candidate = await createCandidate('Applied');
    const { interview } = await schedule(candidate.id);

    const res = await request(app)
      .post(`/api/interviews/${interview.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.candidate.status).toBe('Interview Scheduled');
  });

  it('moves back to Interview Scheduled when a new interview is scheduled afterwards', async () => {
    const candidate = await createCandidate('Applied');
    const { interview } = await schedule(candidate.id);
    await complete(interview.id);

    const next = await schedule(candidate.id);

    expect(next.candidate.status).toBe('Interview Scheduled');
  });
});
