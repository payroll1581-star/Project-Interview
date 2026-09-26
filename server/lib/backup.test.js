import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBackup } from './backup.js';

describe('runBackup', () => {
  let root;
  let resumesDir;
  let backupDir;
  let db;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'int-backup-test-'));
    resumesDir = join(root, 'resumes');
    backupDir = join(root, 'backups');
    mkdirSync(resumesDir);
    db = new Database(':memory:');
    db.exec("CREATE TABLE t (v TEXT); INSERT INTO t VALUES ('hello');");
  });

  afterEach(() => {
    db.close();
    rmSync(root, { recursive: true, force: true });
  });

  const dbBackups = () => readdirSync(backupDir).filter((f) => f.endsWith('.db')).sort();

  it('writes a timestamped, readable copy of the database', async () => {
    const result = await runBackup({
      db,
      resumesDir,
      backupDir,
      now: new Date('2026-09-26T02:00:00.000Z'),
    });

    expect(result.dbFile).toBe(join(backupDir, 'app-20260926-020000.db'));
    const copy = new Database(result.dbFile, { readonly: true });
    expect(copy.prepare('SELECT v FROM t').get().v).toBe('hello');
    copy.close();
  });

  it('mirrors resumes: copies new files and removes ones deleted from the source', async () => {
    writeFileSync(join(resumesDir, 'a.pdf'), 'A');
    writeFileSync(join(resumesDir, 'b.pdf'), 'B');
    await runBackup({ db, resumesDir, backupDir, now: new Date('2026-09-26T02:00:00.000Z') });
    expect(readdirSync(join(backupDir, 'resumes')).sort()).toEqual(['a.pdf', 'b.pdf']);

    rmSync(join(resumesDir, 'a.pdf'));
    writeFileSync(join(resumesDir, 'c.pdf'), 'C');
    const second = await runBackup({ db, resumesDir, backupDir, now: new Date('2026-09-27T02:00:00.000Z') });

    expect(readdirSync(join(backupDir, 'resumes')).sort()).toEqual(['b.pdf', 'c.pdf']);
    expect(second.resumesCopied).toBe(1);
    expect(second.resumesRemoved).toBe(1);
  });

  it('prunes database backups older than keepDays but keeps recent ones', async () => {
    mkdirSync(backupDir, { recursive: true });
    for (const stamp of ['20260801-020000', '20260910-020000', '20260920-020000']) {
      writeFileSync(join(backupDir, `app-${stamp}.db`), 'x');
    }

    const result = await runBackup({
      db,
      resumesDir,
      backupDir,
      keepDays: 14,
      now: new Date('2026-09-26T02:00:00.000Z'),
    });

    // Cutoff is 12 Sep: the 1 Aug and 10 Sep backups go, 20 Sep and the new one stay.
    expect(dbBackups()).toEqual(['app-20260920-020000.db', 'app-20260926-020000.db']);
    expect(result.pruned).toBe(2);
  });

  it('never prunes files that are not its own backups', async () => {
    mkdirSync(backupDir, { recursive: true });
    writeFileSync(join(backupDir, 'notes.db'), 'keep me');
    writeFileSync(join(backupDir, 'app-old.db'), 'keep me too');

    await runBackup({ db, resumesDir, backupDir, keepDays: 1, now: new Date('2026-09-26T02:00:00.000Z') });

    expect(existsSync(join(backupDir, 'notes.db'))).toBe(true);
    expect(existsSync(join(backupDir, 'app-old.db'))).toBe(true);
  });

  it('refuses to run, and deletes nothing, when the resumes folder is missing', async () => {
    writeFileSync(join(resumesDir, 'a.pdf'), 'A');
    await runBackup({ db, resumesDir, backupDir, now: new Date('2026-09-26T02:00:00.000Z') });
    rmSync(resumesDir, { recursive: true });

    await expect(
      runBackup({ db, resumesDir, backupDir, now: new Date('2026-09-27T02:00:00.000Z') }),
    ).rejects.toThrow(/resumes folder/i);
    expect(readdirSync(join(backupDir, 'resumes'))).toEqual(['a.pdf']);
  });

  it('rejects a keepDays that is not a positive integer', async () => {
    for (const keepDays of [0, -1, 1.5, NaN]) {
      await expect(runBackup({ db, resumesDir, backupDir, keepDays })).rejects.toThrow(RangeError);
    }
  });
});
