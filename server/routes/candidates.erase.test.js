import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { db } from '../db.js';
import { clearData, createUser } from '../test/helpers.js';

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('DELETE /api/candidates/:id (erasure)', () => {
  let adminToken;
  let interviewer;

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

  it('removes the candidate name and email from the activity log too', async () => {
    const created = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Zelda Quixote',
        email: 'zelda.quixote@test.com',
        phone: '555-0101',
        position: 'Engineer',
        status: 'Applied',
      });
    const candidateId = created.body.id;

    const scheduled = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId,
        interviewerIds: [interviewer.id],
        date: new Date('2026-03-01T10:00:00.000Z').toISOString(),
        durationMinutes: 30,
        type: 'Phone',
      });
    expect(scheduled.status).toBe(201);
    // The confirmation email is fire-and-forget; give its log entry time to land.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const before = JSON.stringify(db.prepare('SELECT * FROM activity_log').all());
    expect(before).toContain('Zelda Quixote');

    const res = await request(app)
      .delete(`/api/candidates/${candidateId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);

    const after = JSON.stringify(db.prepare('SELECT * FROM activity_log').all());
    expect(after).not.toContain('Zelda Quixote');
    expect(after).not.toContain('zelda.quixote@test.com');

    const deletedEntry = db.prepare("SELECT * FROM activity_log WHERE action = 'candidate.deleted'").get();
    expect(deletedEntry.entity_id).toBe(candidateId);
    expect(deletedEntry.entity_label).toBe('Deleted candidate');
    expect(deletedEntry.details).toContain('1 associated interview');

    expect(db.prepare('SELECT COUNT(*) AS n FROM candidates WHERE id = ?').get(candidateId).n).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM interviews WHERE candidate_id = ?').get(candidateId).n).toBe(0);
  });

  it('leaves other candidates\' log entries untouched', async () => {
    const other = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bystander Bob', email: 'bob@test.com', phone: '555-0102', position: 'Engineer', status: 'Applied' });
    const doomed = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Doomed Dan', email: 'dan@test.com', phone: '555-0103', position: 'Engineer', status: 'Applied' });

    await request(app)
      .delete(`/api/candidates/${doomed.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const bobEntries = db
      .prepare("SELECT * FROM activity_log WHERE entity_type = 'candidate' AND entity_id = ?")
      .all(other.body.id);
    expect(bobEntries.length).toBeGreaterThan(0);
    expect(bobEntries.every((e) => e.entity_label === 'Bystander Bob')).toBe(true);
  });
});
