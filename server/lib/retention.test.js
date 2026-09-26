import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db.js';
import { purgeExpiredRejected } from './retention.js';

const NOW = new Date('2026-09-26T00:00:00.000Z');

const insertCandidate = db.prepare(
  `INSERT INTO candidates (id, name, email, phone, position, status, created_at)
   VALUES (@id, @name, @email, '555', 'Engineer', @status, @createdAt)`,
);
const insertInterview = db.prepare(
  `INSERT INTO interviews (id, candidate_id, date, duration_minutes, type, status)
   VALUES (@id, @candidateId, @date, 30, 'Phone', 'Completed')`,
);
const insertLog = db.prepare(
  `INSERT INTO activity_log (id, actor_name, action, entity_type, entity_id, entity_label, created_at)
   VALUES (@id, 'Admin', 'candidate.status_changed', 'candidate', @entityId, @label, @createdAt)`,
);

function addCandidate(id, status, createdAt) {
  insertCandidate.run({ id, name: `Name ${id}`, email: `${id}@test.com`, status, createdAt });
}

describe('purgeExpiredRejected', () => {
  beforeEach(() => {
    db.exec('DELETE FROM activity_log; DELETE FROM interviews; DELETE FROM candidates;');
    addCandidate('old-rejected', 'Rejected', '2024-01-01T00:00:00.000Z');
    addCandidate('recent-interview', 'Rejected', '2024-01-01T00:00:00.000Z');
    insertInterview.run({ id: 'i1', candidateId: 'recent-interview', date: '2026-08-01T00:00:00.000Z' });
    addCandidate('recent-log', 'Rejected', '2024-01-01T00:00:00.000Z');
    insertLog.run({ id: 'l1', entityId: 'recent-log', label: 'Name recent-log', createdAt: '2026-08-15T00:00:00.000Z' });
    addCandidate('old-offer', 'Offer', '2024-01-01T00:00:00.000Z');
    addCandidate('new-rejected', 'Rejected', '2026-09-01T00:00:00.000Z');
  });

  const remaining = () =>
    db.prepare('SELECT id FROM candidates ORDER BY id').all().map((r) => r.id);

  it('dry run lists only rejected candidates inactive for longer than the cutoff and deletes nothing', () => {
    const result = purgeExpiredRejected({ months: 12, now: NOW });

    expect(result.applied).toBe(false);
    expect(result.matches.map((m) => m.id)).toEqual(['old-rejected']);
    expect(result.purged).toBe(0);
    expect(remaining()).toHaveLength(5);
  });

  it('apply erases the matches, their interviews, and their names in the log, and records the purge', () => {
    insertInterview.run({ id: 'i-old', candidateId: 'old-rejected', date: '2024-02-01T00:00:00.000Z' });
    insertLog.run({ id: 'l-old', entityId: 'old-rejected', label: 'Name old-rejected', createdAt: '2024-02-01T00:00:00.000Z' });

    const result = purgeExpiredRejected({ months: 12, now: NOW, apply: true });

    expect(result.purged).toBe(1);
    expect(remaining()).toEqual(['new-rejected', 'old-offer', 'recent-interview', 'recent-log']);
    expect(db.prepare("SELECT COUNT(*) AS n FROM interviews WHERE candidate_id = 'old-rejected'").get().n).toBe(0);

    const log = JSON.stringify(db.prepare('SELECT * FROM activity_log').all());
    expect(log).not.toContain('Name old-rejected');
    const purged = db.prepare("SELECT * FROM activity_log WHERE action = 'candidate.purged'").get();
    expect(purged.entity_id).toBe('old-rejected');
    expect(purged.actor_name).toBe('System');
    expect(purged.details).toContain('2024-02-01');
  });

  it('treats a candidate as active until the newest of created date, interview date, and log entry', () => {
    const shorter = purgeExpiredRejected({ months: 1, now: NOW });
    expect(shorter.matches.map((m) => m.id).sort()).toEqual(['old-rejected', 'recent-interview', 'recent-log']);
  });

  it('rejects a months value that is not a positive integer', () => {
    for (const months of [0, -3, 1.5, NaN, undefined, '12']) {
      expect(() => purgeExpiredRejected({ months, now: NOW })).toThrow(RangeError);
    }
  });
});
