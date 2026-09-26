import { Router } from 'express';
import { db } from '../db.js';
import { generateId } from '../lib/ids.js';
import { serializeInterview, serializeCandidate } from '../lib/serialize.js';
import { computeEvaluationResult } from '../lib/evaluation.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendMail } from '../lib/mailer.js';
import { logActivity } from '../lib/activityLog.js';

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
  `INSERT INTO interviews (id, candidate_id, date, duration_minutes, type, status, location, room, notes)
   VALUES (@id, @candidateId, @date, @durationMinutes, @type, 'Scheduled', @location, @room, @notes)`,
);
const insertInterviewer = db.prepare('INSERT INTO interview_interviewers (interview_id, user_id) VALUES (?, ?)');
const getCandidate = db.prepare('SELECT * FROM candidates WHERE id = ?');
const countInterviewsByStatus = db.prepare(
  `SELECT COALESCE(SUM(status = 'Scheduled'), 0) AS scheduled,
          COALESCE(SUM(status = 'Completed'), 0) AS completed
   FROM interviews WHERE candidate_id = ?`,
);
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

const ROOM_MAX_LENGTH = 100;

// null/undefined mean "no room" (and clear it on PATCH); anything else must be a short string.
function validateRoom(room) {
  if (room === undefined || room === null) return null;
  if (typeof room !== 'string') return 'room must be a string.';
  if (room.trim().length > ROOM_MAX_LENGTH) return `room must be at most ${ROOM_MAX_LENGTH} characters.`;
  return null;
}

function normalizeRoom(room) {
  return typeof room === 'string' && room.trim() ? room.trim() : null;
}

function loadInterview(id) {
  const row = getInterview.get(id);
  if (!row) return undefined;
  const interviewerIds = getInterviewerIds.all(id).map((r) => r.userId);
  return serializeInterview(row, interviewerIds, getScoresForInterview.all(id));
}

// Advance an 'Interview Scheduled' candidate to 'Interviewed' once no interview is still pending
// and at least one was completed. Never touches Applied/Screening/Offer/Rejected (an admin may
// have moved them manually). Call inside the transaction that changed the interview's status.
function advanceCandidateIfInterviewed(candidateId) {
  if (getCandidate.get(candidateId)?.status !== 'Interview Scheduled') return false;
  const { scheduled, completed } = countInterviewsByStatus.get(candidateId);
  if (scheduled > 0 || completed === 0) return false;
  updateCandidateStatus.run('Interviewed', candidateId);
  return true;
}

function logInterviewedAdvance(actor, candidate) {
  logActivity({
    actor,
    action: 'candidate.status_changed',
    entityType: 'candidate',
    entityId: candidate.id,
    entityLabel: candidate.name,
    details: 'Interview Scheduled → Interviewed',
  });
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
    interview.room ? `Room: ${interview.room}` : null,
    interview.location ? `Location: ${interview.location}` : null,
    '',
    message ? `Message from the scheduler:\n${message}` : null,
  ].filter((line) => line !== null);

  return lines.join('\n');
}

function buildCandidateConfirmationEmail({ candidate, interview }) {
  const lines = [
    `Hi ${candidate.name},`,
    '',
    `This confirms your ${interview.type.toLowerCase()} interview${candidate.position ? ` for ${candidate.position}` : ''}.`,
    '',
    `Date & time: ${formatInterviewDateTime(interview.date)}`,
    interview.room ? `Room: ${interview.room}` : null,
    interview.location ? `Location: ${interview.location}` : null,
    '',
    "We look forward to speaking with you. If you have any questions or need to reschedule, please reply to this email.",
  ].filter((line) => line !== null);

  return lines.join('\n');
}

function buildInterviewUpdatedEmail({ greetingName, candidate, interview, previous, forCandidate }) {
  const previouslyParts = [];
  if (previous.date !== interview.date) {
    previouslyParts.push(`date & time ${formatInterviewDateTime(previous.date)}`);
  }
  if (previous.room !== interview.room) previouslyParts.push(`room ${previous.room ?? '(none)'}`);
  if (previous.location !== interview.location) {
    previouslyParts.push(`location ${previous.location ?? '(none)'}`);
  }

  const forPosition = candidate.position ? ` for ${candidate.position}` : '';
  const lines = [
    `Hi ${greetingName},`,
    '',
    forCandidate
      ? `Your ${interview.type.toLowerCase()} interview${forPosition} has been updated. Please note the new details:`
      : `The ${interview.type.toLowerCase()} interview with ${candidate.name}${forPosition} has been updated:`,
    '',
    `Date & time: ${formatInterviewDateTime(interview.date)}`,
    interview.room ? `Room: ${interview.room}` : null,
    interview.location ? `Location: ${interview.location}` : null,
    '',
    `Previously: ${previouslyParts.join('; ')}`,
    '',
    forCandidate
      ? 'If this does not work for you, please reply to this email.'
      : 'Please update your calendar accordingly.',
  ].filter((line) => line !== null);

  return lines.join('\n');
}

// Fire-and-forget (like the scheduling confirmation): a slow or failing mail server must never
// delay or fail the edit itself. Only counts are logged, never the recipients' addresses.
function notifyInterviewUpdated({ actor, candidate, interview, previous }) {
  const subject = `Interview updated — ${formatInterviewDateTime(interview.date)}`;
  const mails = [];
  if (candidate?.email) {
    mails.push({
      to: candidate.email,
      text: buildInterviewUpdatedEmail({
        greetingName: candidate.name,
        candidate,
        interview,
        previous,
        forCandidate: true,
      }),
    });
  }
  for (const { userId } of getInterviewerIds.all(interview.id)) {
    const interviewer = getUserRow.get(userId);
    if (!interviewer?.email) continue;
    mails.push({
      to: interviewer.email,
      text: buildInterviewUpdatedEmail({
        greetingName: interviewer.name,
        candidate,
        interview,
        previous,
        forCandidate: false,
      }),
    });
  }
  if (mails.length === 0) return;

  Promise.allSettled(mails.map((mail) => sendMail({ to: mail.to, subject, text: mail.text }))).then((results) => {
    const delivered = results.filter((r) => r.status === 'fulfilled' && r.value?.sent).length;
    for (const r of results) {
      if (r.status === 'rejected') console.error('[mailer] Failed to send interview update:', r.reason);
    }
    if (!getInterview.get(interview.id)) return;
    logActivity({
      actor,
      action: 'interview.update_notified',
      entityType: 'interview',
      entityId: interview.id,
      entityLabel: candidate?.name,
      details: `${delivered}/${mails.length} sent${delivered < mails.length ? ' (see server log for details)' : ''}`,
    });
  });
}

const listOtherScheduledInterviews = db.prepare(
  `SELECT interviews.*, candidates.name AS candidate_name
   FROM interviews JOIN candidates ON candidates.id = interviews.candidate_id
   WHERE interviews.status = 'Scheduled' AND interviews.id != ?`,
);

// Interviews overlap when each starts before the other ends, so back-to-back slots are fine.
// A conflict needs a shared interviewer or the same room (compared case- and space-insensitively).
function findConflicts({ excludeId = '', date, durationMinutes, interviewerIds, room }) {
  const start = new Date(date).getTime();
  const end = start + Number(durationMinutes) * 60_000;
  const roomKey = room ? room.trim().toLowerCase() : null;

  const conflicts = [];
  for (const other of listOtherScheduledInterviews.all(excludeId)) {
    const otherStart = new Date(other.date).getTime();
    const otherEnd = otherStart + other.duration_minutes * 60_000;
    if (!(start < otherEnd && otherStart < end)) continue;

    const otherInterviewerIds = getInterviewerIds.all(other.id).map((r) => r.userId);
    const sharedInterviewerIds = interviewerIds.filter((id) => otherInterviewerIds.includes(id));
    const sameRoom = Boolean(roomKey && other.room && other.room.trim().toLowerCase() === roomKey);
    if (sharedInterviewerIds.length === 0 && !sameRoom) continue;

    conflicts.push({
      interviewId: other.id,
      candidateName: other.candidate_name,
      date: other.date,
      durationMinutes: other.duration_minutes,
      interviewerIds: sharedInterviewerIds,
      room: sameRoom ? other.room : undefined,
    });
  }
  return conflicts;
}

function conflictMessage(conflicts) {
  const parts = conflicts.flatMap((c) => {
    const when = formatInterviewDateTime(c.date);
    const lines = [];
    if (c.interviewerIds.length > 0) {
      const names = c.interviewerIds.map((id) => getUserRow.get(id)?.name ?? 'An interviewer').join(', ');
      lines.push(`${names} already booked for ${c.candidateName} on ${when}`);
    }
    if (c.room) lines.push(`room "${c.room}" is in use by ${c.candidateName} on ${when}`);
    return lines;
  });
  return `Scheduling conflict: ${parts.join('; ')}.`;
}

function conflictResponse(res, conflicts) {
  return res.status(409).json({ error: conflictMessage(conflicts), code: 'schedule_conflict', conflicts });
}

router.use(requireAuth);

router.get('/', (req, res) => {
  const { status, limit, offset } = req.query;
  const rows = status
    ? db.prepare('SELECT * FROM interviews WHERE status = ? ORDER BY date ASC').all(status)
    : listInterviews.all();

  let visibleRows =
    req.user.role === 'admin'
      ? rows
      : rows.filter((row) => getInterviewerIds.all(row.id).some((r) => r.userId === req.user.id));

  if (status || limit || offset) {
    res.set('X-Total-Count', String(visibleRows.length));
  }
  if (limit) {
    const lim = Math.max(0, Number(limit)) || 0;
    const off = Math.max(0, Number(offset) || 0);
    visibleRows = visibleRows.slice(off, off + lim);
  }

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
  const { candidateId, interviewerIds, date, durationMinutes, type, location, room, notes } = req.body ?? {};
  if (!candidateId || !Array.isArray(interviewerIds) || interviewerIds.length === 0 || !date || !durationMinutes || !type) {
    return res.status(400).json({
      error: 'candidateId, interviewerIds (non-empty), date, durationMinutes, and type are required.',
    });
  }
  const roomError = validateRoom(room);
  if (roomError) {
    return res.status(400).json({ error: roomError });
  }
  const candidate = getCandidate.get(candidateId);
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }
  if (req.body.allowConflict !== true) {
    const conflicts = findConflicts({
      date,
      durationMinutes,
      interviewerIds,
      room: normalizeRoom(room),
    });
    if (conflicts.length > 0) return conflictResponse(res, conflicts);
  }

  const interview = {
    id: generateId('i'),
    candidateId,
    date,
    durationMinutes,
    type,
    location: location ?? null,
    room: normalizeRoom(room),
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

  logActivity({
    actor: req.user,
    action: 'interview.scheduled',
    entityType: 'interview',
    entityId: interview.id,
    entityLabel: candidate.name,
    details: `${type} interview on ${formatInterviewDateTime(date)}`,
  });

  // Fire-and-forget: don't let a slow/failed mail send delay or fail the scheduling response.
  if (candidate.email) {
    sendMail({
      to: candidate.email,
      subject: `Your interview is scheduled — ${formatInterviewDateTime(date)}`,
      text: buildCandidateConfirmationEmail({ candidate, interview }),
    })
      .then(({ sent }) => {
        // The mail can finish after the candidate was erased; logging then would re-add their name and email.
        if (!getCandidate.get(candidate.id)) return;
        logActivity({
          actor: req.user,
          action: 'candidate.confirmation_sent',
          entityType: 'candidate',
          entityId: candidate.id,
          entityLabel: candidate.name,
          details: sent ? `Sent to ${candidate.email}` : `Logged (SMTP not configured), would send to ${candidate.email}`,
        });
      })
      .catch((err) => {
        console.error(`[mailer] Failed to send candidate confirmation to ${candidate.email}:`, err);
        if (!getCandidate.get(candidate.id)) return;
        logActivity({
          actor: req.user,
          action: 'candidate.confirmation_failed',
          entityType: 'candidate',
          entityId: candidate.id,
          entityLabel: candidate.name,
          details: err?.message ?? 'Unknown error',
        });
      });
  }

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
  const cancel = db.transaction(() => {
    db.prepare("UPDATE interviews SET status = 'Cancelled' WHERE id = ?").run(req.params.id);
    return advanceCandidateIfInterviewed(existing.candidate_id);
  });
  const advancedCandidate = cancel();

  const candidate = getCandidate.get(existing.candidate_id);
  logActivity({
    actor: req.user,
    action: 'interview.cancelled',
    entityType: 'interview',
    entityId: existing.id,
    entityLabel: candidate?.name,
  });
  if (advancedCandidate) {
    logInterviewedAdvance(req.user, candidate);
  }

  res.json({
    interview: loadInterview(req.params.id),
    candidate: candidate ? serializeCandidate(candidate) : null,
  });
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

  const sentCount = results.filter((r) => r.status === 'sent' || r.status === 'logged').length;
  logActivity({
    actor: req.user,
    action: 'interview.notified',
    entityType: 'interview',
    entityId: existing.id,
    entityLabel: candidate?.name,
    details: `${sentCount}/${results.length} interviewer(s) notified: ${results.map((r) => `${r.email} (${r.status})`).join(', ')}`,
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

    return advanceCandidateIfInterviewed(existing.candidate_id);
  });
  const advancedCandidate = complete();

  const completedCandidate = getCandidate.get(existing.candidate_id);
  logActivity({
    actor: req.user,
    action: 'interview.completed',
    entityType: 'interview',
    entityId: existing.id,
    entityLabel: completedCandidate?.name,
    details: `Result: ${result} (${totalScore}/${maxScore})`,
  });
  if (advancedCandidate) {
    logInterviewedAdvance(req.user, completedCandidate);
  }

  res.json({
    interview: loadInterview(req.params.id),
    candidate: completedCandidate ? serializeCandidate(completedCandidate) : null,
  });
});

router.patch('/:id', requireRole('admin'), (req, res) => {
  const existing = getInterview.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Interview not found.' });
  }
  const patch = req.body ?? {};
  const roomError = 'room' in patch ? validateRoom(patch.room) : null;
  if (roomError) {
    return res.status(400).json({ error: roomError });
  }
  const merged = {
    ...existing,
    date: patch.date ?? existing.date,
    duration_minutes: patch.durationMinutes ?? existing.duration_minutes,
    type: patch.type ?? existing.type,
    location: 'location' in patch ? patch.location || null : existing.location,
    room: 'room' in patch ? normalizeRoom(patch.room) : existing.room,
    notes: 'notes' in patch ? patch.notes || null : existing.notes,
  };

  // Only re-check when the slot itself moved, so editing notes on a legacy double-booking still works.
  const slotChanged =
    merged.date !== existing.date ||
    merged.duration_minutes !== existing.duration_minutes ||
    merged.room !== existing.room;
  if (existing.status === 'Scheduled' && slotChanged && patch.allowConflict !== true) {
    const conflicts = findConflicts({
      excludeId: existing.id,
      date: merged.date,
      durationMinutes: merged.duration_minutes,
      interviewerIds: getInterviewerIds.all(existing.id).map((r) => r.userId),
      room: merged.room,
    });
    if (conflicts.length > 0) return conflictResponse(res, conflicts);
  }

  db.prepare(
    `UPDATE interviews SET date = @date, duration_minutes = @duration_minutes, type = @type,
       location = @location, room = @room, notes = @notes WHERE id = @id`,
  ).run(merged);

  const rescheduledCandidate = getCandidate.get(existing.candidate_id);
  if (
    existing.status === 'Scheduled' &&
    (merged.date !== existing.date || merged.room !== existing.room || merged.location !== existing.location)
  ) {
    notifyInterviewUpdated({
      actor: req.user,
      candidate: rescheduledCandidate,
      interview: merged,
      previous: { date: existing.date, room: existing.room, location: existing.location },
    });
  }
  logActivity({
    actor: req.user,
    action: merged.date !== existing.date ? 'interview.rescheduled' : 'interview.updated',
    entityType: 'interview',
    entityId: existing.id,
    entityLabel: rescheduledCandidate?.name,
    details:
      merged.date !== existing.date
        ? `${formatInterviewDateTime(existing.date)} → ${formatInterviewDateTime(merged.date)}`
        : undefined,
  });

  res.json(loadInterview(req.params.id));
});

export default router;
