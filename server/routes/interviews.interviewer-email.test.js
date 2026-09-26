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

describe('emails to interviewers when an interview is scheduled or cancelled', () => {
  let adminToken;
  let priya;
  let daniel;
  let candidateId;

  beforeAll(async () => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
    adminToken = await loginAs('admin@test.com', 'admin123');
    priya = createUser({ name: 'Priya Nair', email: 'priya@test.com', password: 'pw123456', role: 'interviewer' });
    daniel = createUser({ name: 'Daniel Cho', email: 'daniel@test.com', password: 'pw123456', role: 'interviewer' });
  });

  beforeEach(async () => {
    clearCandidatesAndInterviews();
    sendMail.mockReset();
    sendMail.mockResolvedValue({ sent: true });
    const candidate = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Alice', email: 'alice@test.com', phone: '555-0199', position: 'Engineer', status: 'Applied' });
    candidateId = candidate.body.id;
  });

  const inDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const recipients = () => sendMail.mock.calls.map(([mail]) => mail.to).sort();
  const settle = () => new Promise((resolve) => setTimeout(resolve, 100));
  const logEntry = (action) => db.prepare('SELECT * FROM activity_log WHERE action = ?').get(action);

  function schedule(overrides = {}) {
    return request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId,
        interviewerIds: [priya.id, daniel.id],
        date: inDays(7),
        durationMinutes: 60,
        type: 'Technical',
        room: 'Room 1',
        ...overrides,
      });
  }

  const cancel = (id) =>
    request(app).post(`/api/interviews/${id}/cancel`).set('Authorization', `Bearer ${adminToken}`);

  describe('when scheduled', () => {
    it('emails every assigned interviewer as well as the candidate', async () => {
      const res = await schedule();
      expect(res.status).toBe(201);

      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(3));
      expect(recipients()).toEqual(['alice@test.com', 'daniel@test.com', 'priya@test.com']);

      const priyaMail = sendMail.mock.calls.find(([mail]) => mail.to === 'priya@test.com')[0];
      expect(priyaMail.subject).toMatch(/assigned/i);
      expect(priyaMail.text).toContain('Hi Priya Nair');
      expect(priyaMail.text).toContain('Alice');
      expect(priyaMail.text).toContain('Room: Room 1');
    });

    it('does not put the candidate\'s contact details in the interviewer email', async () => {
      await schedule();
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(3));

      const priyaMail = sendMail.mock.calls.find(([mail]) => mail.to === 'priya@test.com')[0];
      expect(priyaMail.text).not.toContain('alice@test.com');
      expect(priyaMail.text).not.toContain('555-0199');
    });

    it('logs how many were sent, without any addresses', async () => {
      await schedule();
      await vi.waitFor(() => expect(logEntry('interview.assignment_notified')).toBeTruthy());

      const entry = logEntry('interview.assignment_notified');
      expect(entry.details).toBe('2/2 sent');
      expect(JSON.stringify(entry)).not.toContain('@');
    });

    it('sends nothing when the request is rejected as a double-booking', async () => {
      await schedule();
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(3));
      sendMail.mockClear();

      const clash = await schedule({ date: inDays(7) });
      expect(clash.status).toBe(409);
      await settle();
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('still schedules, and logs a partial result, when one interviewer\'s email fails', async () => {
      sendMail.mockImplementation(({ to }) =>
        to === 'daniel@test.com' ? Promise.reject(new Error('mailbox full')) : Promise.resolve({ sent: true }),
      );

      const res = await schedule();
      expect(res.status).toBe(201);

      await vi.waitFor(() => expect(logEntry('interview.assignment_notified')).toBeTruthy());
      expect(logEntry('interview.assignment_notified').details).toMatch(/^1\/2 sent/);
    });

    it('does not write an erased candidate back into the log when the emails finish late', async () => {
      const releases = [];
      sendMail.mockImplementation(() => new Promise((resolve) => releases.push(() => resolve({ sent: true }))));

      await schedule();
      await vi.waitFor(() => expect(releases).toHaveLength(3));
      await request(app)
        .delete(`/api/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      releases.forEach((release) => release());
      await settle();

      expect(JSON.stringify(db.prepare('SELECT * FROM activity_log').all())).not.toContain('Alice');
    });
  });

  describe('when cancelled', () => {
    it('emails the interviewers, not the candidate', async () => {
      const scheduled = await schedule();
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(3));
      sendMail.mockClear();

      const res = await cancel(scheduled.body.interview.id);
      expect(res.status).toBe(200);

      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(2));
      expect(recipients()).toEqual(['daniel@test.com', 'priya@test.com']);
      const mail = sendMail.mock.calls[0][0];
      expect(mail.subject).toMatch(/cancelled/i);
      expect(mail.text).toContain('Alice');
      expect(mail.text).toMatch(/cancelled/i);

      await vi.waitFor(() => expect(logEntry('interview.cancel_notified')).toBeTruthy());
      expect(logEntry('interview.cancel_notified').details).toBe('2/2 sent');
    });

    it('sends nothing for an interview whose time has already passed', async () => {
      const scheduled = await schedule({ date: inDays(-3) });
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(3));
      sendMail.mockClear();

      expect((await cancel(scheduled.body.interview.id)).status).toBe(200);
      await settle();
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('does not email again when the same interview is cancelled twice', async () => {
      const scheduled = await schedule();
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(3));
      sendMail.mockClear();

      await cancel(scheduled.body.interview.id).expect(200);
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(2));
      expect((await cancel(scheduled.body.interview.id)).status).toBe(409);
      await settle();
      expect(sendMail).toHaveBeenCalledTimes(2);
    });
  });
});
