import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { clearCandidatesAndInterviews, clearData, createUser } from '../test/helpers.js';

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('candidate resume upload/download/delete', () => {
  let adminToken;
  let candidateId;

  // Logging in once (rather than per-test) keeps this file well under the login rate
  // limiter's window -- that limiter is real and shared module state for the file.
  beforeAll(async () => {
    clearData();
    createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
    adminToken = await loginAs('admin@test.com', 'admin123');
  });

  beforeEach(async () => {
    clearCandidatesAndInterviews();
    const candidate = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Candidate', email: 'cand@test.com', phone: '555-0000', position: 'Engineer', status: 'Applied' });
    candidateId = candidate.body.id;
  });

  it('uploads a PDF and points resumeUrl at the internal download route', async () => {
    const res = await request(app)
      .post(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 fake resume content'), 'resume.pdf');
    expect(res.status).toBe(200);
    expect(res.body.resumeUrl).toBe(`/candidates/${candidateId}/resume`);
  });

  it('rejects a disallowed file type', async () => {
    const res = await request(app)
      .post(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('resume', Buffer.from('just text'), 'resume.txt');
    expect(res.status).toBe(400);
  });

  it('forbids a non-admin from uploading', async () => {
    createUser({ name: 'Interviewer', email: 'int@test.com', password: 'pw123456', role: 'interviewer' });
    const token = await loginAs('int@test.com', 'pw123456');

    const res = await request(app)
      .post(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', Buffer.from('%PDF-1.4 fake'), 'resume.pdf');
    expect(res.status).toBe(403);
  });

  it('serves the uploaded file back to an admin', async () => {
    await request(app)
      .post(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 fake resume content'), 'resume.pdf');

    const res = await request(app)
      .get(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('pdf');
    expect(Buffer.isBuffer(res.body) ? res.body.toString() : res.text).toContain('%PDF-1.4');
  });

  it('forbids an unrelated interviewer from downloading the resume', async () => {
    await request(app)
      .post(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 fake'), 'resume.pdf');

    createUser({ name: 'Outsider', email: 'outsider@test.com', password: 'pw123456', role: 'interviewer' });
    const token = await loginAs('outsider@test.com', 'pw123456');

    const res = await request(app)
      .get(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('allows an assigned interviewer to download the resume', async () => {
    await request(app)
      .post(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 fake'), 'resume.pdf');

    const interviewer = createUser({
      name: 'Assigned',
      email: 'assigned@test.com',
      password: 'pw123456',
      role: 'interviewer',
    });
    await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId,
        interviewerIds: [interviewer.id],
        date: new Date().toISOString(),
        durationMinutes: 30,
        type: 'Phone',
      });
    const token = await loginAs('assigned@test.com', 'pw123456');

    const res = await request(app)
      .get(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('removes the resume and 404s on subsequent download', async () => {
    await request(app)
      .post(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 fake'), 'resume.pdf');

    const del = await request(app)
      .delete(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
    expect(del.body.resumeUrl).toBeUndefined();

    const get = await request(app)
      .get(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(get.status).toBe(404);
  });

  it('replacing resumeUrl by hand clears a previously uploaded file', async () => {
    await request(app)
      .post(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 fake'), 'resume.pdf');

    await request(app)
      .patch(`/api/candidates/${candidateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resumeUrl: 'https://example.com/external-resume.pdf' })
      .expect(200);

    const get = await request(app)
      .get(`/api/candidates/${candidateId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(get.status).toBe(404);
  });
});
