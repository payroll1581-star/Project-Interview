// Usage: npm run db:backup [-- --out <dir>] [--keep-days 14]
// BACKUP_DIR in .env is used when --out is not given.
import 'dotenv/config';
import { db } from './db.js';
import { RESUMES_DIR } from './lib/uploads.js';
import { runBackup } from './lib/backup.js';

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const backupDir = argValue('--out') ?? process.env.BACKUP_DIR;
if (!backupDir) {
  console.error('No backup folder. Pass --out <dir> or set BACKUP_DIR in .env.');
  process.exit(1);
}

const keepDaysArg = argValue('--keep-days');
const keepDays = keepDaysArg === undefined ? 14 : Number(keepDaysArg);

try {
  const result = await runBackup({ db, resumesDir: RESUMES_DIR, backupDir, keepDays });
  console.log(`Database backed up to ${result.dbFile}`);
  console.log(
    `Resumes: ${result.resumesCopied} copied, ${result.resumesRemoved} removed from the mirror. ` +
      `Old backups pruned: ${result.pruned}.`,
  );
  db.close();
} catch (err) {
  console.error(`Backup failed: ${err.message}`);
  db.close();
  process.exit(1);
}
