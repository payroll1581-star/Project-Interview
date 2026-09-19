import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { generateId } from '../lib/ids.js';

const insertUser = db.prepare(
  'INSERT INTO users (id, name, email, password_hash, role, position) VALUES (?, ?, ?, ?, ?, ?)',
);

// Low bcrypt cost keeps the suite fast -- only ever used against the in-memory test DB.
const TEST_BCRYPT_COST = 4;

export function createUser({ name, email, password, role, position = null }) {
  const id = generateId('u');
  insertUser.run(id, name, email, bcrypt.hashSync(password, TEST_BCRYPT_COST), role, position);
  return { id, name, email, role, position };
}

export function clearData() {
  db.exec(`
    DELETE FROM evaluation_scores;
    DELETE FROM interview_interviewers;
    DELETE FROM interviews;
    DELETE FROM candidates;
    DELETE FROM sessions;
    DELETE FROM activity_log;
    DELETE FROM users;
  `);
}
