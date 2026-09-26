import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

const BACKUP_NAME = /^app-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.db$/;

function stamp(now) {
  return now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
}

function backupTime(fileName) {
  const m = BACKUP_NAME.exec(fileName);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
}

function verifyBackup(dbFile) {
  const copy = new Database(dbFile, { readonly: true });
  try {
    const result = copy.pragma('integrity_check', { simple: true });
    if (result !== 'ok') throw new Error(`Backup ${dbFile} failed the integrity check: ${result}`);
  } finally {
    copy.close();
  }
}

// Resume files are named by unique ids and never modified, so "not present" is enough to copy.
// Files deleted from the source are removed from the mirror too, so an erased candidate's resume
// doesn't live on in the backup folder (the database copies age out through keepDays instead).
function mirrorResumes(resumesDir, mirrorDir) {
  if (!existsSync(resumesDir)) {
    throw new Error(`Resumes folder not found: ${resumesDir}. Nothing was deleted from the backup.`);
  }
  mkdirSync(mirrorDir, { recursive: true });

  const source = new Set(readdirSync(resumesDir));
  const mirrored = new Set(readdirSync(mirrorDir));
  // The app creates a missing resumes folder on start-up, so a mistyped RESUME_UPLOAD_DIR looks like
  // an existing, empty folder -- syncing that would wipe the whole mirror.
  if (source.size === 0 && mirrored.size > 0) {
    throw new Error(
      `The resumes folder is empty but the backup mirror holds ${mirrored.size} file(s); nothing was deleted. ` +
        `Check RESUME_UPLOAD_DIR, or empty ${mirrorDir} by hand if every resume really was deleted.`,
    );
  }
  let copied = 0;
  let removed = 0;
  for (const file of source) {
    if (!mirrored.has(file)) {
      copyFileSync(join(resumesDir, file), join(mirrorDir, file));
      copied += 1;
    }
  }
  for (const file of mirrored) {
    if (!source.has(file)) {
      unlinkSync(join(mirrorDir, file));
      removed += 1;
    }
  }
  return { copied, removed };
}

// Uses SQLite's online backup API, so it is safe while the server is running (unlike copying app.db).
export async function runBackup({ db, resumesDir, backupDir, keepDays = 14, now = new Date() }) {
  if (!Number.isInteger(keepDays) || keepDays < 1) {
    throw new RangeError('keepDays must be a positive integer.');
  }
  mkdirSync(backupDir, { recursive: true });

  // The database copy comes first: a problem with the resume folder must never cost a night's DB backup.
  const dbFile = join(backupDir, `app-${stamp(now)}.db`);
  await db.backup(dbFile);
  verifyBackup(dbFile);

  const resumes = mirrorResumes(resumesDir, join(backupDir, 'resumes'));

  // Only files matching our own naming are ever pruned.
  const cutoff = now.getTime() - keepDays * 24 * 60 * 60 * 1000;
  let pruned = 0;
  for (const file of readdirSync(backupDir)) {
    const time = backupTime(file);
    if (time !== null && time < cutoff) {
      unlinkSync(join(backupDir, file));
      pruned += 1;
    }
  }

  return { dbFile, verified: true, resumesCopied: resumes.copied, resumesRemoved: resumes.removed, pruned };
}
