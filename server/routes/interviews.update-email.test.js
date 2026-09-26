import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../lib/mailer.js', () => ({ sendMail: vi.fn().mockResolvedValue({ sent: true }) }));

const { app } = await import('../index.js');
const { sendMail } = await import('../lib/mailer.js');
const { db } = await import('../db.js');
const { clearData, clearCandidatesAndInterviews, createUser } = await import('../test/helpers.js');

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('emails sent when an interview is edited', () => {
  let adminToken;
  let priya;
  let daniel;
  let interviewId;

  beforeAll(async () => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
    adminToken = await loginAs('admin@test.com', 'admin123');
    priya = createUser({ name: 'Priya Nair', email: 'priya@test.com', password: 'pw123456', role: 'interviewer' });
    daniel = createUser({ name: 'Daniel Cho', email: 'daniel@test.com', password: 'pw123456', role: 'interviewer' });
  });

  beforeEach(async () => {
    clearCandidatesAndInterviews();
    const candidate = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Alice', email: 'alice@test.com', phone: '555', position: 'Engineer', status: 'Applied' });
    const scheduled = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId: candidate.body.id,
        interviewerIds: [priya.id, daniel.id],
        date: new Date('2026-03-02T10:00:00.000Z').toISOString(),
        durationMinutes: 60,
        type: 'Onsite',
        room: 'Room 1',
        location: 'HQ',
      });
    interviewId = scheduled.body.interview.id;
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalled());
    sendMail.mockClear();
  });

  const patch = (body) =>
    request(app).patch(`/api/interviews/${interviewId}`).set('Authorization', `Bearer ${adminToken}`).send(body);
  const recipients = () => sendMail.mock.calls.map(([mail]) => mail.to).sort();

  it('emails the candidate and every assigned interviewer when the time changes', async () => {
    const res = await patch({ date: new Date('2026-03-03T14:00:00.000Z').toISOString() });
    expect(res.status).toBe(200);

    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(3));
    expect(recipients()).toEqual(['alice@test.com', 'daniel@test.com', 'priya@test.com']);

    const candidateMail = sendMail.mock.calls.find(([mail]) => mail.to === 'alice@test.com')[0];
    expect(candidateMail.subject).toMatch(/updated/i);
    expect(candidateMail.text).toContain('Room: Room 1');
    expect(candidateMail.text).toMatch(/Previously/);
  });

  it('emails when only the room or the location changes', async () => {
    await patch({ room: 'Room 9' });
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(3));
    expect(sendMail.mock.calls[0][0].text).toContain('Room: Room 9');

    sendMail.mockClear();
    await patch({ location: 'Annex' });
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(3));
  });

  it('sends nothing for edits that do not change when or where (notes, type, duration, no-op)', async () => {
    await patch({ notes: 'bring laptop' });
    await patch({ durationMinutes: 45, type: 'Phone' });
    await patch({ room: 'Room 1', date: new Date('2026-03-02T10:00:00.000Z').toISOString() });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('sends nothing for an interview that is no longer scheduled', async () => {
    await request(app)
      .post(`/api/interviews/${interviewId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await patch({ room: 'Room 9' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('still returns 200 and logs the failure when a send rejects', async () => {
    sendMail.mockRejectedValueOnce(new Error('smtp down'));
    const res = await patch({ room: 'Room 9' });
    expect(res.status).toBe(200);

    await vi.waitFor(() => {
      const entry = db.prepare("SELECT * FROM activity_log WHERE action = 'interview.update_notified'").get();
      expect(entry.details).toMatch(/2\/3/);
    });
  });
});
