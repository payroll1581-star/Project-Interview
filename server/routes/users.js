import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { generateId } from '../lib/ids.js';
import { serializeUser } from '../lib/serialize.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const listUsers = db.prepare('SELECT * FROM users ORDER BY rowid');
const listUsersForInterviewer = db.prepare(
  `SELECT DISTINCT users.* FROM users
   JOIN interview_interviewers ON interview_interviewers.user_id = users.id
   WHERE interview_interviewers.interview_id IN (
     SELECT interview_id FROM interview_interviewers WHERE user_id = ?
   ) OR users.id = ?
   ORDER BY users.rowid`,
);
const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const insertUser = db.prepare(
  `INSERT INTO users (id, name, email, password_hash, role, position)
   VALUES (@id, @name, @email, @passwordHash, @role, @position)`,
);
const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
const updateUserPassword = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
const countAdmins = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
const countAssignments = db.prepare(
  'SELECT COUNT(*) AS count FROM interview_interviewers WHERE user_id = ?',
);

router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = req.user.role === 'admin' ? listUsers.all() : listUsersForInterviewer.all(req.user.id, req.user.id);
  res.json(rows.map(serializeUser));
});

router.post('/', requireRole('admin'), (req, res) => {
  const { name, email, password, position } = req.body ?? {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required.' });
  }
  if (getUserByEmail.get(email)) {
    return res.status(409).json({ error: 'A user with that email already exists.' });
  }

  const user = {
    id: generateId('u'),
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'interviewer',
    position: position || null,
  };
  insertUser.run(user);

  res.status(201).json({ ...serializeUser(getUser.get(user.id)), password });
});

router.patch('/me/password', (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const user = getUser.get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  updateUserPassword.run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.status(204).end();
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const existing = getUser.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'User not found.' });
  }
  if (existing.role === 'admin' && countAdmins.get().count <= 1) {
    return res.status(409).json({ error: 'Cannot delete the last remaining admin.' });
  }
  if (countAssignments.get(req.params.id).count > 0) {
    return res.status(409).json({
      error: 'Cannot delete a user assigned to one or more interviews. Reassign or cancel those interviews first.',
    });
  }
  deleteUser.run(req.params.id);
  res.status(204).end();
});

export default router;
