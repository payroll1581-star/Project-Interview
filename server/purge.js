// Usage: npm run db:purge -- --months 12           (dry run: only lists what would be deleted)
//        npm run db:purge -- --months 12 --apply   (permanently deletes them)
// Deletes REJECTED candidates with no activity (created, interviewed, or edited) for that many
// months -- their interviews, resume file, and their name in the activity log go with them.
import 'dotenv/config';
import { db } from './db.js';
import { purgeExpiredRejected } from './lib/retention.js';

const monthsIndex = process.argv.indexOf('--months');
const months = monthsIndex === -1 ? NaN : Number(process.argv[monthsIndex + 1]);
const apply = process.argv.includes('--apply');

if (!Number.isInteger(months) || months < 1) {
  console.error('Pass --months <whole number, at least 1>, e.g. npm run db:purge -- --months 12');
  process.exit(1);
}

const result = purgeExpiredRejected({ months, apply });
console.log(`Rejected candidates with no activity since ${result.cutoff.slice(0, 10)}: ${result.matches.length}`);
for (const match of result.matches) {
  console.log(`  ${match.id}  ${match.name}  (last activity ${match.lastActivityAt.slice(0, 10)})`);
}
console.log(
  apply
    ? `Deleted ${result.purged} candidate(s).`
    : result.matches.length > 0
      ? 'Dry run: nothing deleted. Re-run with --apply to delete them permanently.'
      : 'Nothing to delete.',
);
db.close();
