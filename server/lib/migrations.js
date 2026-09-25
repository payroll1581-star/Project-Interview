// SQLite can't alter a CHECK constraint in place, so widening candidates.status means rebuilding
// the table. foreign_keys must be OFF for the rebuild (DROP TABLE would otherwise cascade-delete
// every interview), and that pragma is a no-op inside a transaction -- hence set outside it.
// The CREATE TABLE below must stay in sync with candidates in schema.sql (+ resume_filename,
// which db.js adds with ensureColumn).
export function migrateCandidateInterviewedStatus(db) {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'candidates'")
    .get();
  if (!row || row.sql.includes("'Interviewed'")) return;

  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE candidates_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          position TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('Applied', 'Screening', 'Interview Scheduled', 'Interviewed', 'Offer', 'Rejected')),
          resume_url TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          resume_filename TEXT
        );
        INSERT INTO candidates_new (id, name, email, phone, position, status, resume_url, notes, created_at, resume_filename)
          SELECT id, name, email, phone, position, status, resume_url, notes, created_at, resume_filename FROM candidates;
        DROP TABLE candidates;
        ALTER TABLE candidates_new RENAME TO candidates;

        -- One-time backfill: candidates already stuck at 'Interview Scheduled' with every
        -- interview finished. Runs only during the rebuild so a later manual status choice
        -- by an admin is never overridden on restart.
        UPDATE candidates SET status = 'Interviewed'
        WHERE status = 'Interview Scheduled'
          AND EXISTS (SELECT 1 FROM interviews i WHERE i.candidate_id = candidates.id AND i.status = 'Completed')
          AND NOT EXISTS (SELECT 1 FROM interviews i WHERE i.candidate_id = candidates.id AND i.status = 'Scheduled');
      `);

      // Throwing here rolls the whole rebuild back, so a bad foreign key never gets committed.
      const violations = db.pragma('foreign_key_check');
      if (violations.length > 0) {
        throw new Error(
          `candidates migration aborted: ${violations.length} foreign key violation(s) after rebuild (first: ${JSON.stringify(violations[0])}).`,
        );
      }
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}
