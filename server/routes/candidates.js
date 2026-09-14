import { Router } from 'express';
import { db } from '../db.js';
import { generateId } from '../lib/ids.js';
import { serializeCandidate } from '../lib/serialize.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

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
const insertCandidate = db.prepare(
  `INSERT INTO candidates (id, name, email, phone, position, status, resume_url, notes, created_at)
   VALUES (@id, @name, @email, @phone, @position, @status, @resumeUrl, @notes, @createdAt)`,
);

router.use(requireAuth);

router.get('/', (req, res) => {
  const rows =
    req.user.role === 'admin' ? listCandidates.all() : listCandidatesForInterviewer.all(req.user.id);
  res.json(rows.map(serializeCandidate));
});

router.post('/', requireRole('admin'), (req, res) => {
  const { name, email, phone, position, status, resumeUrl, notes } = req.body ?? {};
  if (!name || !email || !phone || !position || !status) {
    return res.status(400).json({ error: 'name, email, phone, position, and status are required.' });
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

  db.prepare(
    `UPDATE candidates SET name = @name, email = @email, phone = @phone, position = @position,
       status = @status, resume_url = @resume_url, notes = @notes WHERE id = @id`,
  ).run(merged);

  res.json(serializeCandidate(getCandidate.get(req.params.id)));
});

export default router;
