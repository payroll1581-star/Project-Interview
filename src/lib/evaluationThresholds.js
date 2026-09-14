export const HIRE_THRESHOLD = 0.72;
export const COMPARE_THRESHOLD = 0.6;

export function computeEvaluationResult(totalScore, maxScore) {
  const ratio = maxScore > 0 ? totalScore / maxScore : 0;
  if (ratio >= HIRE_THRESHOLD) return 'Hire';
  if (ratio >= COMPARE_THRESHOLD) return 'Compare';
  return 'Reject';
}
