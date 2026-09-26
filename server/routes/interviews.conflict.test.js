import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { clearData, clearCandidatesAndInterviews, createUser } from '../test/helpers.js';

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('interview double-booking checks', () => {
  let adminToken;
  let priya;
  let daniel;
  let eve;
  let candidateA;
  let candidateB;

  beforeAll(async () => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
    adminToken = await loginAs('admin@test.com', 'admin123');
    priya = createUser({ name: 'Priya Nair', email: 'priya@test.com', password: 'pw123456', role: 'interviewer' });
    daniel = createUser({ name: 'Daniel Cho', email: 'daniel@test.com', password: 'pw123456', role: 'interviewer' });
    eve = createUser({ name: 'Eve Ong', email: 'eve@test.com', password: 'pw123456', role: 'interviewer' });
  });

  beforeEach(async () => {
    clearCandidatesAndInterviews();
    candidateA = await createCandidate('Alice', 'alice@test.com');
    candidateB = await createCandidate('Bob', 'bob@test.com');
  });

  async function createCandidate(name, email) {
    const res = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, email, phone: '555', position: 'Engineer', status: 'Applied' });
    return res.body;
  }

  // Times are on 2026-03-02 UTC; `at('10:00')` -> 10:00Z.
  const at = (hhmm) => new Date(`2026-03-02T${hhmm}:00.000Z`).toISOString();

  function schedule(candidateId, overrides = {}) {
    return request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId,
        interviewerIds: [priya.id],
        date: at('10:00'),
        durationMinutes: 60,
        type: 'Phone',
        ...overrides,
      });
  }

  const patch = (id, body) =>
    request(app).patch(`/api/interviews/${id}`).set('Authorization', `Bearer ${adminToken}`).send(body);

  it('rejects an overlapping interview for the same interviewer with a 409 that names them', async () => {
    await schedule(candidateA.id);
    const res = await schedule(candidateB.id, { date: at('10:30') });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('schedule_conflict');
    expect(res.body.error).toContain('Priya Nair');
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].interviewerIds).toEqual([priya.id]);
  });

  it('does not create the interview or move the candidate when rejected', async () => {
    await schedule(candidateA.id);
    await schedule(candidateB.id, { date: at('10:30') });

    const interviews = await request(app).get('/api/interviews').set('Authorization', `Bearer ${adminToken}`);
    expect(interviews.body).toHaveLength(1);
    const candidates = await request(app).get('/api/candidates').set('Authorization', `Bearer ${adminToken}`);
    expect(candidates.body.find((c) => c.id === candidateB.id).status).toBe('Applied');
  });

  it('allows back-to-back interviews (one ends exactly when the next starts)', async () => {
    await schedule(candidateA.id);
    expect((await schedule(candidateB.id, { date: at('11:00') })).status).toBe(201);
    expect((await schedule(candidateB.id, { date: at('09:00') })).status).toBe(201);
  });

  it('allows different interviewers at the same time', async () => {
    await schedule(candidateA.id);
    expect((await schedule(candidateB.id, { interviewerIds: [daniel.id] })).status).toBe(201);
  });

  it('rejects the same room at an overlapping time, ignoring case and spacing', async () => {
    await schedule(candidateA.id, { room: 'HQ - Room 4B' });
    const res = await schedule(candidateB.id, { interviewerIds: [daniel.id], room: '  hq - room 4b ' });

    expect(res.status).toBe(409);
    expect(res.body.conflicts[0].room).toBe('HQ - Room 4B');
    expect(res.body.error).toContain('HQ - Room 4B');
  });

  it('allows a different room, or no room, at the same time', async () => {
    await schedule(candidateA.id, { room: 'Room 1' });
    expect((await schedule(candidateB.id, { interviewerIds: [daniel.id], room: 'Room 2' })).status).toBe(201);
    expect((await schedule(candidateB.id, { interviewerIds: [eve.id] })).status).toBe(201);
  });

  it('lets an admin override with allowConflict: true', async () => {
    await schedule(candidateA.id);
    const res = await schedule(candidateB.id, { date: at('10:30'), allowConflict: true });
    expect(res.status).toBe(201);
  });

  it('ignores cancelled and completed interviews', async () => {
    const first = await schedule(candidateA.id);
    await request(app)
      .post(`/api/interviews/${first.body.interview.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((await schedule(candidateB.id, { date: at('10:30') })).status).toBe(201);
  });

  describe('when editing', () => {
    it('rejects moving an interview into a conflict, and allows it with allowConflict', async () => {
      await schedule(candidateA.id);
      const second = await schedule(candidateB.id, { date: at('13:00') });
      const id = second.body.interview.id;

      const blocked = await patch(id, { date: at('10:15') });
      expect(blocked.status).toBe(409);
      expect(blocked.body.code).toBe('schedule_conflict');

      const stored = await request(app).get('/api/interviews').set('Authorization', `Bearer ${adminToken}`);
      expect(stored.body.find((i) => i.id === id).date).toBe(at('13:00'));

      expect((await patch(id, { date: at('10:15'), allowConflict: true })).status).toBe(200);
    });

    it('does not conflict with itself when only the room changes', async () => {
      const first = await schedule(candidateA.id, { room: 'Room 1' });
      expect((await patch(first.body.interview.id, { room: 'Room 2' })).status).toBe(200);
    });

    it('rejects changing to a room that is already in use at that time', async () => {
      await schedule(candidateA.id, { room: 'Room 1' });
      const second = await schedule(candidateB.id, { interviewerIds: [daniel.id], room: 'Room 2' });
      const res = await patch(second.body.interview.id, { room: 'Room 1' });
      expect(res.status).toBe(409);
    });

    it('does not re-check when only notes change, even if a conflict already exists', async () => {
      await schedule(candidateA.id);
      const second = await schedule(candidateB.id, { date: at('10:30'), allowConflict: true });
      expect((await patch(second.body.interview.id, { notes: 'bring laptop' })).status).toBe(200);
    });
  });
});
