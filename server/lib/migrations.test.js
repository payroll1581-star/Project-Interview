import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { migrateCandidateInterviewedStatus } from './migrations.js';

function oldSchemaDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE candidates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      position TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Applied', 'Screening', 'Interview Scheduled', 'Offer', 'Rejected')),
      resume_url TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      resume_filename TEXT
    );
    CREATE TABLE interviews (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      status TEXT NOT NULL
    );
  `);
  const addCandidate = db.prepare(
    "INSERT INTO candidates (id, name, email, phone, position, status, created_at) VALUES (?, ?, ?, '1', 'Eng', ?, 'now')",
  );
  const addInterview = db.prepare('INSERT INTO interviews (id, candidate_id, status) VALUES (?, ?, ?)');
  addCandidate.run('done', 'Done', 'done@t.com', 'Interview Scheduled');
  addInterview.run('i1', 'done', 'Completed');
  addCandidate.run('pending', 'Pending', 'pending@t.com', 'Interview Scheduled');
  addInterview.run('i2', 'pending', 'Completed');
  addInterview.run('i3', 'pending', 'Scheduled');
  addCandidate.run('cancelled', 'Cancelled', 'cancelled@t.com', 'Interview Scheduled');
  addInterview.run('i4', 'cancelled', 'Cancelled');
  addCandidate.run('offer', 'Offer', 'offer@t.com', 'Offer');
  addInterview.run('i5', 'offer', 'Completed');
  return db;
}

describe('migrateCandidateInterviewedStatus', () => {
  it('accepts the new status and backfills only fully-finished candidates', () => {
    const db = oldSchemaDb();
    migrateCandidateInterviewedStatus(db);

    const status = (id) => db.prepare('SELECT status FROM candidates WHERE id = ?').get(id).status;
    expect(status('done')).toBe('Interviewed');
    expect(status('pending')).toBe('Interview Scheduled');
    expect(status('cancelled')).toBe('Interview Scheduled');
    expect(status('offer')).toBe('Offer');
    expect(() => db.prepare("UPDATE candidates SET status = 'Interviewed' WHERE id = 'offer'").run()).not.toThrow();
  });

  it('keeps interviews and the foreign key wiring intact', () => {
    const db = oldSchemaDb();
    migrateCandidateInterviewedStatus(db);

    expect(db.prepare('SELECT COUNT(*) AS n FROM interviews').get().n).toBe(5);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(() =>
      db.prepare("INSERT INTO interviews (id, candidate_id, status) VALUES ('x', 'missing', 'Scheduled')").run(),
    ).toThrow();
    db.prepare("DELETE FROM candidates WHERE id = 'offer'").run();
    expect(db.prepare("SELECT COUNT(*) AS n FROM interviews WHERE candidate_id = 'offer'").get().n).toBe(0);
  });

  it('rolls back and throws when the rebuild would leave a foreign key violation', () => {
    const db = oldSchemaDb();
    db.pragma('foreign_keys = OFF');
    db.prepare("INSERT INTO interviews (id, candidate_id, status) VALUES ('orphan', 'missing', 'Scheduled')").run();
    db.pragma('foreign_keys = ON');

    expect(() => migrateCandidateInterviewedStatus(db)).toThrow(/foreign key violation/);

    const sql = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'candidates'").get().sql;
    expect(sql.includes("'Interviewed'")).toBe(false);
    expect(db.prepare('SELECT COUNT(*) AS n FROM candidates').get().n).toBe(4);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('is a no-op once migrated (does not re-backfill manual choices)', () => {
    const db = oldSchemaDb();
    migrateCandidateInterviewedStatus(db);
    db.prepare("UPDATE candidates SET status = 'Interview Scheduled' WHERE id = 'done'").run();

    migrateCandidateInterviewedStatus(db);

    expect(db.prepare("SELECT status FROM candidates WHERE id = 'done'").get().status).toBe('Interview Scheduled');
  });
});
