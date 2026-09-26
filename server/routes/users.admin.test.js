import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { db } from '../db.js';
import { clearData, createUser } from '../test/helpers.js';

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('admin user management', () => {
  let admin;
  let adminToken;
  let interviewer;
  let interviewerToken;

  beforeAll(async () => {
    clearData();
    admin = createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
    adminToken = await loginAs('admin@test.com', 'admin123');
    interviewer = createUser({
      name: 'Old Name',
      email: 'interviewer@test.com',
      password: 'oldpass123',
      role: 'interviewer',
      position: 'QA',
    });
    interviewerToken = await loginAs('interviewer@test.com', 'oldpass123');
  });

  const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

  describe('PATCH /api/users/:id', () => {
    it('updates name and position and logs it', async () => {
      const res = await asAdmin(request(app).patch(`/api/users/${interviewer.id}`)).send({
        name: '  New Name ',
        position: 'Lead ',
      });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New Name');
      expect(res.body.position).toBe('Lead');
      expect(res.body.email).toBe('interviewer@test.com');

      const log = db.prepare("SELECT * FROM activity_log WHERE action = 'user.updated'").get();
      expect(log.entity_id).toBe(interviewer.id);
    });

    it('clears the position with an empty string and leaves omitted fields alone', async () => {
      await asAdmin(request(app).patch(`/api/users/${interviewer.id}`)).send({ position: 'Lead' });
      const cleared = await asAdmin(request(app).patch(`/api/users/${interviewer.id}`)).send({ position: '' });
      expect(cleared.body.position).toBeUndefined();
      expect(cleared.body.name).toBe('New Name');
    });

    it('rejects an empty or non-string name', async () => {
      const empty = await asAdmin(request(app).patch(`/api/users/${interviewer.id}`)).send({ name: '   ' });
      expect(empty.status).toBe(400);
      const wrongType = await asAdmin(request(app).patch(`/api/users/${interviewer.id}`)).send({ name: 42 });
      expect(wrongType.status).toBe(400);
    });

    it('returns 404 for an unknown user and 403 for a non-admin', async () => {
      const missing = await asAdmin(request(app).patch('/api/users/nope')).send({ name: 'X' });
      expect(missing.status).toBe(404);
      const forbidden = await request(app)
        .patch(`/api/users/${interviewer.id}`)
        .set('Authorization', `Bearer ${interviewerToken}`)
        .send({ name: 'Hacker' });
      expect(forbidden.status).toBe(403);
    });
  });

  describe('POST /api/users/:id/reset-password', () => {
    it('sets a new password and revokes that user\'s existing sessions', async () => {
      const res = await asAdmin(request(app).post(`/api/users/${interviewer.id}/reset-password`)).send({
        newPassword: 'brandnew123',
      });
      expect(res.status).toBe(204);

      const oldSession = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${interviewerToken}`);
      expect(oldSession.status).toBe(401);
      expect(await loginAs('interviewer@test.com', 'brandnew123')).toBeTruthy();
      const oldPassword = await request(app)
        .post('/api/auth/login')
        .send({ email: 'interviewer@test.com', password: 'oldpass123' });
      expect(oldPassword.status).toBe(401);

      const log = db.prepare("SELECT * FROM activity_log WHERE action = 'user.password_reset'").get();
      expect(log.entity_id).toBe(interviewer.id);
      expect(JSON.stringify(log)).not.toContain('brandnew123');
    });

    it('rejects a password shorter than 8 characters or of the wrong type', async () => {
      const short = await asAdmin(request(app).post(`/api/users/${interviewer.id}/reset-password`)).send({
        newPassword: 'short',
      });
      expect(short.status).toBe(400);
      const wrongType = await asAdmin(request(app).post(`/api/users/${interviewer.id}/reset-password`)).send({
        newPassword: 12345678,
      });
      expect(wrongType.status).toBe(400);
    });

    it('refuses to reset the caller\'s own password this way', async () => {
      const res = await asAdmin(request(app).post(`/api/users/${admin.id}/reset-password`)).send({
        newPassword: 'whatever123',
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown user and 403 for a non-admin', async () => {
      const missing = await asAdmin(request(app).post('/api/users/nope/reset-password')).send({
        newPassword: 'whatever123',
      });
      expect(missing.status).toBe(404);
      const token = await loginAs('interviewer@test.com', 'brandnew123');
      const forbidden = await request(app)
        .post(`/api/users/${interviewer.id}/reset-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({ newPassword: 'whatever123' });
      expect(forbidden.status).toBe(403);
    });
  });
});
