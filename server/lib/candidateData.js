import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '../db.js';
import { RESUMES_DIR } from './uploads.js';

export const ERASED_LABEL = 'Deleted candidate';

const getInterviewIds = db.prepare('SELECT id FROM interviews WHERE candidate_id = ?');
// activity_log keeps denormalized snapshots (candidate name, email, uploaded file names) so
// history stays readable -- which means erasing a candidate must scrub those snapshots too.
const scrubCandidateEntries = db.prepare(
  `UPDATE activity_log SET entity_label = @label, details = NULL
   WHERE entity_type = 'candidate' AND entity_id = @id`,
);
const scrubInterviewEntries = db.prepare(
  `UPDATE activity_log SET entity_label = @label
   WHERE entity_type = 'interview' AND entity_id = @id`,
);
const deleteCandidateRow = db.prepare('DELETE FROM candidates WHERE id = ?');

export function deleteResumeFileIfAny(candidateRow) {
  if (!candidateRow.resume_filename) return;
  const filePath = join(RESUMES_DIR, candidateRow.resume_filename);
  if (existsSync(filePath)) unlinkSync(filePath);
}

// Removes the candidate, their interviews (FK cascade), their resume file, and their
// identifying details in the activity log. The caller records the deletion event itself.
export function eraseCandidate(candidateRow) {
  const interviewIds = getInterviewIds.all(candidateRow.id).map((r) => r.id);

  db.transaction(() => {
    scrubCandidateEntries.run({ id: candidateRow.id, label: ERASED_LABEL });
    for (const id of interviewIds) {
      scrubInterviewEntries.run({ id, label: ERASED_LABEL });
    }
    deleteCandidateRow.run(candidateRow.id);
  })();

  // After the commit, so a failed delete never leaves a candidate row pointing at a missing file.
  deleteResumeFileIfAny(candidateRow);

  return { interviewCount: interviewIds.length };
}
