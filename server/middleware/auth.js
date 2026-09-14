import { db } from '../db.js';

const getSession = db.prepare(
  `SELECT sessions.user_id AS userId, sessions.expires_at AS expiresAt,
          users.id, users.name, users.email, users.role
   FROM sessions JOIN users ON users.id = sessions.user_id
   WHERE sessions.token = ?`,
);
const deleteSession = db.prepare('DELETE FROM sessions WHERE token = ?');

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const session = getSession.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
  if (new Date(session.expiresAt) < new Date()) {
    deleteSession.run(token);
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  req.user = { id: session.id, name: session.name, email: session.email, role: session.role };
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}
