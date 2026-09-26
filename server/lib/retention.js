import { db } from '../db.js';
import { ERASED_LABEL, eraseCandidate } from './candidateData.js';
import { logActivity } from './activityLog.js';

// "Last activity" = newest of the created date, the latest interview, and the latest
// candidate-level log entry. There is no separate "rejected at" column to lean on.
const listRejectedWithLastActivity = db.prepare(
  `SELECT c.*,
     MAX(
       c.created_at,
       COALESCE((SELECT MAX(date) FROM interviews WHERE candidate_id = c.id), ''),
       COALESCE((SELECT MAX(created_at) FROM activity_log WHERE entity_type = 'candidate' AND entity_id = c.id), '')
     ) AS last_activity_at
   FROM candidates c
   WHERE c.status = 'Rejected'`,
);

function cutoffIso(months, now) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff.toISOString();
}

// Dry-run by default: pass apply: true to actually delete.
export function purgeExpiredRejected({ months, apply = false, now = new Date() } = {}) {
  if (!Number.isInteger(months) || months < 1) {
    throw new RangeError('months must be a positive integer.');
  }

  const cutoff = cutoffIso(months, now);
  const matches = listRejectedWithLastActivity
    .all()
    .filter((row) => row.last_activity_at < cutoff)
    .map((row) => ({ row, id: row.id, name: row.name, lastActivityAt: row.last_activity_at }));

  let purged = 0;
  if (apply) {
    for (const match of matches) {
      eraseCandidate(match.row);
      logActivity({
        actor: null,
        action: 'candidate.purged',
        entityType: 'candidate',
        entityId: match.id,
        entityLabel: ERASED_LABEL,
        details: `Retention purge: rejected, last activity ${match.lastActivityAt.slice(0, 10)}`,
      });
      purged += 1;
    }
  }

  return {
    applied: apply,
    cutoff,
    matches: matches.map(({ id, name, lastActivityAt }) => ({ id, name, lastActivityAt })),
    purged,
  };
}
