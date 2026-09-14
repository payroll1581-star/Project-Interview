import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { generateId } from '../lib/ids.js';
import { serializeUser } from '../lib/serialize.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const insertSession = db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)');
const deleteSession = db.prepare('DELETE FROM sessions WHERE token = ?');

router.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = getUserByEmail.get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateId('session');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  insertSession.run(token, user.id, expiresAt);

  res.json({ token, user: serializeUser(user) });
});

router.post('/logout', requireAuth, (req, res) => {
  const header = req.headers.authorization;
  const token = header.slice('Bearer '.length);
  deleteSession.run(token);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
