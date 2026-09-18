import { Router } from 'express';
import { db } from '../db.js';
import { generateId } from '../lib/ids.js';
import { serializeInterview, serializeCandidate } from '../lib/serialize.js';
import { computeEvaluationResult } from '../lib/evaluation.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendMail } from '../lib/mailer.js';

const router = Router();

const listInterviews = db.prepare('SELECT * FROM interviews ORDER BY date ASC');
const getInterview = db.prepare('SELECT * FROM interviews WHERE id = ?');
const getInterviewerIds = db.prepare(
  'SELECT user_id AS userId FROM interview_interviewers WHERE interview_id = ? ORDER BY rowid',
);
const getScoresForInterview = db.prepare(
  'SELECT section_name, criterion_name, score FROM evaluation_scores WHERE interview_id = ? ORDER BY sort_order',
);
const insertInterview = db.prepare(
  `INSERT INTO interviews (id, candidate_id, date, duration_minutes, type, status, location, notes)
   VALUES (@id, @candidateId, @date, @durationMinutes, @type, 'Scheduled', @location, @notes)`,
);
const insertInterviewer = db.prepare('INSERT INTO interview_interviewers (interview_id, user_id) VALUES (?, ?)');
const getCandidate = db.prepare('SELECT * FROM candidates WHERE id = ?');
const getUserRow = db.prepare('SELECT * FROM users WHERE id = ?');
const updateCandidateStatus = db.prepare('UPDATE candidates SET status = ? WHERE id = ?');
const getCriterion = db.prepare(
  `SELECT evaluation_criteria.id, evaluation_criteria.name AS criterion_name, evaluation_sections.name AS section_name
   FROM evaluation_criteria JOIN evaluation_sections ON evaluation_sections.id = evaluation_criteria.section_id
   WHERE evaluation_criteria.id = ?`,
);
const deleteScoresForInterview = db.prepare('DELETE FROM evaluation_scores WHERE interview_id = ?');
const insertScore = db.prepare(
  `INSERT INTO evaluation_scores (interview_id, sort_order, section_name, criterion_name, score)
   VALUES (?, ?, ?, ?, ?)`,
);

function loadInterview(id) {
  const row = getInterview.get(id);
  if (!row) return undefined;
  const interviewerIds = getInterviewerIds.all(id).map((r) => r.userId);
  return serializeInterview(row, interviewerIds, getScoresForInterview.all(id));
}

// Interview dates are stored as UTC; format in the organisation's zone, not the server's.
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Bangkok';

function formatInterviewDateTime(iso) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function buildNotificationEmail({ interviewer, candidate, interview, message }) {
  const lines = [
    `Hi ${interviewer.name},`,
    '',
    `This is a reminder that you're scheduled to interview ${candidate?.name ?? 'a candidate'}${candidate?.position ? ` for ${candidate.position}` : ''}.`,
    '',
    `Date & time: ${formatInterviewDateTime(interview.date)}`,
    `Type: ${interview.type}`,
    interview.location ? `Location: ${interview.location}` : null,
    '',
    message ? `Message from the scheduler:\n${message}` : null,
  ].filter((line) => line !== null);

  return lines.join('\n');
}

router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = listInterviews.all();
  const visibleRows =
    req.user.role === 'admin'
      ? rows
      : rows.filter((row) => getInterviewerIds.all(row.id).some((r) => r.userId === req.user.id));
  res.json(
    visibleRows.map((row) =>
      serializeInterview(
        row,
        getInterviewerIds.all(row.id).map((r) => r.userId),
        getScoresForInterview.all(row.id),
      ),
    ),
  );
});

router.post('/', requireRole('admin'), (req, res) => {
  const { candidateId, interviewerIds, date, durationMinutes, type, location, notes } = req.body ?? {};
  if (!candidateId || !Array.isArray(interviewerIds) || interviewerIds.length === 0 || !date || !durationMinutes || !type) {
    return res.status(400).json({
      error: 'candidateId, interviewerIds (non-empty), date, durationMinutes, and type are required.',
    });
  }
  const candidate = getCandidate.get(candidateId);
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  const interview = {
    id: generateId('i'),
    candidateId,
    date,
    durationMinutes,
    type,
    location: location ?? null,
    notes: notes ?? null,
  };

  const schedule = db.transaction(() => {
    insertInterview.run(interview);
    for (const interviewerId of interviewerIds) {
      insertInterviewer.run(interview.id, interviewerId);
    }
    if (candidate.status !== 'Offer' && candidate.status !== 'Rejected') {
      updateCandidateStatus.run('Interview Scheduled', candidateId);
    }
  });
  schedule();

  res.status(201).json({
    interview: loadInterview(interview.id),
    candidate: serializeCandidate(getCandidate.get(candidateId)),
  });
});

router.post('/:id/cancel', requireRole('admin'), (req, res) => {
  const existing = getInterview.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Interview not found.' });
  }
  if (existing.status !== 'Scheduled') {
    return res.status(409).json({ error: `Cannot cancel an interview with status '${existing.status}'.` });
  }
  db.prepare("UPDATE interviews SET status = 'Cancelled' WHERE id = ?").run(req.params.id);
  res.json(loadInterview(req.params.id));
});

router.post('/:id/notify', requireRole('admin'), async (req, res) => {
  const existing = getInterview.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Interview not found.' });
  }
  if (existing.status !== 'Scheduled') {
    return res.status(409).json({ error: `Cannot send a reminder for an interview with status '${existing.status}'.` });
  }

  const interviewers = getInterviewerIds
    .all(req.params.id)
    .map((r) => getUserRow.get(r.userId))
    .filter(Boolean);
  if (interviewers.length === 0) {
    return res.status(400).json({ error: 'No interviewers are assigned to this interview.' });
  }

  const candidate = getCandidate.get(existing.candidate_id);
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

  const subject = `Interview reminder: ${candidate?.name ?? 'Candidate'} on ${formatInterviewDateTime(existing.date)}`;
  const settled = await Promise.allSettled(
    interviewers.map((interviewer) =>
      sendMail({
        to: interviewer.email,
        subject,
        text: buildNotificationEmail({ interviewer, candidate, interview: existing, message }),
      }),
    ),
  );

  const results = settled.map((outcome, index) => {
    const email = interviewers[index].email;
    if (outcome.status === 'rejected') {
      console.error(`[mailer] Failed to send to ${email}:`, outcome.reason);
      return { email, status: 'failed', error: outcome.reason?.message ?? 'Unknown error' };
    }
    return { email, status: outcome.value.sent ? 'sent' : 'logged' };
  });

  res.json({ results });
});

router.post('/:id/complete', (req, res) => {
  const existing = getInterview.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Interview not found.' });
  }
  const interviewerIds = getInterviewerIds.all(req.params.id).map((r) => r.userId);
  const isAssigned = interviewerIds.includes(req.user.id);
  if (req.user.role !== 'admin' && !isAssigned) {
    return res.status(403).json({ error: 'You are not assigned to this interview.' });
  }
  if (existing.status !== 'Scheduled') {
    return res.status(409).json({ error: `Cannot complete an interview with status '${existing.status}'.` });
  }

  const evaluation = req.body?.evaluation;
  const submittedScores = Array.isArray(evaluation?.scores) ? evaluation.scores : [];
  if (submittedScores.length === 0) {
    return res.status(400).json({ error: 'evaluation.scores must be a non-empty array.' });
  }

  const resolvedScores = [];
  for (const entry of submittedScores) {
    const criterion = getCriterion.get(entry.criterionId);
    if (!criterion) {
      return res.status(400).json({ error: `Unknown criterionId: ${entry.criterionId}` });
    }
    const score = Number(entry.score);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Each score must be an integer between 1 and 5.' });
    }
    resolvedScores.push({ sectionName: criterion.section_name, criterionName: criterion.criterion_name, score });
  }

  const totalScore = resolvedScores.reduce((sum, s) => sum + s.score, 0);
  const maxScore = resolvedScores.length * 5;
  const result = computeEvaluationResult(totalScore, maxScore);

  const complete = db.transaction(() => {
    deleteScoresForInterview.run(req.params.id);
    resolvedScores.forEach((s, index) => {
      insertScore.run(req.params.id, index, s.sectionName, s.criterionName, s.score);
    });
    db.prepare(
      `UPDATE interviews SET status = 'Completed',
         eval_total = @evalTotal,
         eval_result = @evalResult,
         eval_notes = @evalNotes,
         eval_interviewer_signature = @evalInterviewerSignature,
         eval_interviewer_position = @evalInterviewerPosition
       WHERE id = @id`,
    ).run({
      id: req.params.id,
      evalTotal: totalScore,
      evalResult: result,
      evalNotes: evaluation?.notes ?? existing.eval_notes ?? null,
      evalInterviewerSignature:
        evaluation?.interviewerSignature ?? existing.eval_interviewer_signature ?? null,
      evalInterviewerPosition:
        evaluation?.interviewerPosition ?? existing.eval_interviewer_position ?? null,
    });
  });
  complete();

  res.json(loadInterview(req.params.id));
});

router.patch('/:id', requireRole('admin'), (req, res) => {
  const existing = getInterview.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Interview not found.' });
  }
  const patch = req.body ?? {};
  const merged = {
    ...existing,
    date: patch.date ?? existing.date,
    duration_minutes: patch.durationMinutes ?? existing.duration_minutes,
    type: patch.type ?? existing.type,
    location: 'location' in patch ? (patch.location ?? null) : existing.location,
    notes: 'notes' in patch ? (patch.notes ?? null) : existing.notes,
  };

  db.prepare(
    `UPDATE interviews SET date = @date, duration_minutes = @duration_minutes, type = @type,
       location = @location, notes = @notes WHERE id = @id`,
  ).run(merged);

  res.json(loadInterview(req.params.id));
});

export default router;
