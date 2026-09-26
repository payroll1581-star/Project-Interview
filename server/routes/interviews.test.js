import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { clearData, clearCandidatesAndInterviews, createUser } from '../test/helpers.js';

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('POST /api/interviews (scheduling)', () => {
  let adminToken;
  let interviewer;

  // Log in once per describe: the login rate limiter (10 per 15 min) is shared module state.
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
  });

  beforeEach(() => {
    clearCandidatesAndInterviews();
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

  it('stores the interview room (trimmed) and returns it', async () => {
    const candidate = await createCandidate('Applied');
    const res = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId: candidate.id,
        interviewerIds: [interviewer.id],
        date: new Date('2026-01-15T10:00:00.000Z').toISOString(),
        durationMinutes: 30,
        type: 'Onsite',
        room: '  HQ - Room 4B  ',
      });
    expect(res.status).toBe(201);
    expect(res.body.interview.room).toBe('HQ - Room 4B');

    const list = await request(app).get('/api/interviews').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.find((i) => i.id === res.body.interview.id).room).toBe('HQ - Room 4B');
  });

  it('leaves room unset when omitted or blank', async () => {
    const candidate = await createCandidate('Applied');
    const omitted = await schedule(candidate.id);
    expect(omitted.body.interview.room).toBeUndefined();

    const blank = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId: candidate.id,
        interviewerIds: [interviewer.id],
        date: new Date('2026-01-16T10:00:00.000Z').toISOString(),
        durationMinutes: 30,
        type: 'Phone',
        room: '   ',
      });
    expect(blank.body.interview.room).toBeUndefined();
  });

  it('updates and clears the room via PATCH, leaving it alone when not sent', async () => {
    const candidate = await createCandidate('Applied');
    const { interview } = (await schedule(candidate.id)).body;
    const patch = (body) =>
      request(app)
        .patch(`/api/interviews/${interview.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body);

    expect((await patch({ room: 'Room 2A' })).body.room).toBe('Room 2A');
    expect((await patch({ notes: 'x' })).body.room).toBe('Room 2A');
    expect((await patch({ room: '' })).body.room).toBeUndefined();
  });

  it('rejects a room that is not a string or is longer than 100 characters', async () => {
    const candidate = await createCandidate('Applied');
    const post = (room) =>
      request(app)
        .post('/api/interviews')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidateId: candidate.id,
          interviewerIds: [interviewer.id],
          date: new Date('2026-01-15T10:00:00.000Z').toISOString(),
          durationMinutes: 30,
          type: 'Phone',
          room,
        });

    expect((await post(12345)).status).toBe(400);
    expect((await post('x'.repeat(101))).status).toBe(400);
    expect((await post('x'.repeat(100))).status).toBe(201);
  });

  it('rejects an invalid room on PATCH without touching the stored room', async () => {
    const candidate = await createCandidate('Applied');
    const { interview } = (await schedule(candidate.id)).body;
    const patch = (body) =>
      request(app)
        .patch(`/api/interviews/${interview.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body);
    await patch({ room: 'Room 2A' });

    expect((await patch({ room: 12345 })).status).toBe(400);
    expect((await patch({ room: 'x'.repeat(101) })).status).toBe(400);
    expect((await patch({ notes: 'still here' })).body.room).toBe('Room 2A');
    expect((await patch({ room: null })).body.room).toBeUndefined();
  });

  it('clears location and notes on PATCH when sent as empty strings', async () => {
    const candidate = await createCandidate('Applied');
    const created = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId: candidate.id,
        interviewerIds: [interviewer.id],
        date: new Date('2026-01-15T10:00:00.000Z').toISOString(),
        durationMinutes: 30,
        type: 'Onsite',
        location: 'Somewhere',
        notes: 'Bring laptop',
      });
    expect(created.body.interview.location).toBe('Somewhere');

    const res = await request(app)
      .patch(`/api/interviews/${created.body.interview.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ location: '', notes: '' });

    expect(res.status).toBe(200);
    expect(res.body.location).toBeUndefined();
    expect(res.body.notes).toBeUndefined();
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
  });

  beforeEach(async () => {
    clearCandidatesAndInterviews();
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
