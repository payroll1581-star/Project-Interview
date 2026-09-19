import { Router } from 'express';
import { db } from '../db.js';
import { generateId } from '../lib/ids.js';
import { serializeCandidate } from '../lib/serialize.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logActivity } from '../lib/activityLog.js';

const router = Router();

const listCandidates = db.prepare('SELECT * FROM candidates ORDER BY created_at DESC');
const listCandidatesForInterviewer = db.prepare(
  `SELECT DISTINCT candidates.* FROM candidates
   JOIN interviews ON interviews.candidate_id = candidates.id
   JOIN interview_interviewers ON interview_interviewers.interview_id = interviews.id
   WHERE interview_interviewers.user_id = ?
   ORDER BY candidates.created_at DESC`,
);
const getCandidate = db.prepare('SELECT * FROM candidates WHERE id = ?');
const getCandidateByEmail = db.prepare('SELECT * FROM candidates WHERE email = ?');
const insertCandidate = db.prepare(
  `INSERT INTO candidates (id, name, email, phone, position, status, resume_url, notes, created_at)
   VALUES (@id, @name, @email, @phone, @position, @status, @resumeUrl, @notes, @createdAt)`,
);
const deleteCandidate = db.prepare('DELETE FROM candidates WHERE id = ?');
const countInterviewsForCandidate = db.prepare(
  'SELECT COUNT(*) AS count FROM interviews WHERE candidate_id = ?',
);

router.use(requireAuth);

router.get('/', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(listCandidatesForInterviewer.all(req.user.id).map(serializeCandidate));
  }

  const { search, status, limit, offset } = req.query;
  if (!search && !status && !limit && !offset) {
    return res.json(listCandidates.all().map(serializeCandidate));
  }

  // Built per-request (rather than pre-prepared) since the WHERE clause is optional --
  // values are still passed as bound params, so this stays injection-safe.
  const clauses = [];
  const params = {};
  if (search) {
    clauses.push('(name LIKE @search OR email LIKE @search)');
    params.search = `%${search}%`;
  }
  if (status) {
    clauses.push('status = @status');
    params.status = status;
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS count FROM candidates ${where}`).get(params).count;

  let sql = `SELECT * FROM candidates ${where} ORDER BY created_at DESC`;
  if (limit) {
    params.limit = Math.max(0, Number(limit)) || 0;
    params.offset = Math.max(0, Number(offset) || 0);
    sql += ' LIMIT @limit OFFSET @offset';
  }

  res.set('X-Total-Count', String(total));
  res.json(db.prepare(sql).all(params).map(serializeCandidate));
});

router.post('/', requireRole('admin'), (req, res) => {
  const { name, email, phone, position, status, resumeUrl, notes } = req.body ?? {};
  if (!name || !email || !phone || !position || !status) {
    return res.status(400).json({ error: 'name, email, phone, position, and status are required.' });
  }
  if (getCandidateByEmail.get(email)) {
    return res.status(409).json({ error: 'A candidate with that email already exists.' });
  }

  const candidate = {
    id: generateId('c'),
    name,
    email,
    phone,
    position,
    status,
    resumeUrl: resumeUrl ?? null,
    notes: notes ?? null,
    createdAt: new Date().toISOString(),
  };
  insertCandidate.run(candidate);
  logActivity({
    actor: req.user,
    action: 'candidate.created',
    entityType: 'candidate',
    entityId: candidate.id,
    entityLabel: candidate.name,
    details: `Position: ${candidate.position}`,
  });
  res.status(201).json(serializeCandidate(getCandidate.get(candidate.id)));
});

router.patch('/:id', requireRole('admin'), (req, res) => {
  const existing = getCandidate.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  const patch = req.body ?? {};
  const merged = {
    ...existing,
    name: patch.name ?? existing.name,
    email: patch.email ?? existing.email,
    phone: patch.phone ?? existing.phone,
    position: patch.position ?? existing.position,
    status: patch.status ?? existing.status,
    resume_url: 'resumeUrl' in patch ? (patch.resumeUrl ?? null) : existing.resume_url,
    notes: 'notes' in patch ? (patch.notes ?? null) : existing.notes,
  };

  if (merged.email !== existing.email) {
    const conflict = getCandidateByEmail.get(merged.email);
    if (conflict && conflict.id !== existing.id) {
      return res.status(409).json({ error: 'A candidate with that email already exists.' });
    }
  }

  db.prepare(
    `UPDATE candidates SET name = @name, email = @email, phone = @phone, position = @position,
       status = @status, resume_url = @resume_url, notes = @notes WHERE id = @id`,
  ).run(merged);

  if (merged.status !== existing.status) {
    logActivity({
      actor: req.user,
      action: 'candidate.status_changed',
      entityType: 'candidate',
      entityId: existing.id,
      entityLabel: merged.name,
      details: `${existing.status} → ${merged.status}`,
    });
  } else {
    logActivity({
      actor: req.user,
      action: 'candidate.updated',
      entityType: 'candidate',
      entityId: existing.id,
      entityLabel: merged.name,
    });
  }

  res.json(serializeCandidate(getCandidate.get(req.params.id)));
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const existing = getCandidate.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  const interviewCount = countInterviewsForCandidate.get(req.params.id).count;
  deleteCandidate.run(req.params.id);
  logActivity({
    actor: req.user,
    action: 'candidate.deleted',
    entityType: 'candidate',
    entityId: existing.id,
    entityLabel: existing.name,
    details: interviewCount > 0 ? `Also removed ${interviewCount} associated interview(s).` : undefined,
  });

  res.status(204).end();
});

export default router;
