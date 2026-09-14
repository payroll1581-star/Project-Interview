export function serializeCandidate(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    position: row.position,
    status: row.status,
    resumeUrl: row.resume_url ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function serializeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    position: row.position ?? undefined,
  };
}

export function serializeEvaluationSection(row, criteria) {
  return {
    id: row.id,
    name: row.name,
    criteria: criteria.map((c) => ({ id: c.id, name: c.name })),
  };
}

export function serializeInterview(row, interviewerIds, scoreRows) {
  const interview = {
    id: row.id,
    candidateId: row.candidate_id,
    interviewerIds,
    date: row.date,
    durationMinutes: row.duration_minutes,
    type: row.type,
    status: row.status,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
  };

  if (row.eval_total !== null && row.eval_total !== undefined) {
    const scores = (scoreRows ?? []).map((s) => ({
      sectionName: s.section_name,
      criterionName: s.criterion_name,
      score: s.score,
    }));
    interview.evaluation = {
      scores,
      totalScore: row.eval_total,
      maxScore: scores.length * 5,
      result: row.eval_result,
      notes: row.eval_notes ?? undefined,
      interviewerSignature: row.eval_interviewer_signature ?? undefined,
      interviewerPosition: row.eval_interviewer_position ?? undefined,
    };
  }

  return interview;
}
