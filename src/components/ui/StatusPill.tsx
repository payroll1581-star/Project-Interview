import { Badge } from './Badge';
import { candidateStatusStyles, interviewStatusStyles, evaluationResultStyles } from '../../lib/status';
import type { CandidateStatus, InterviewStatus, EvaluationResult } from '../../types';

export function CandidateStatusPill({ status }: { status: CandidateStatus }) {
  return <Badge color={candidateStatusStyles[status]}>{status}</Badge>;
}

export function InterviewStatusPill({ status }: { status: InterviewStatus }) {
  return <Badge color={interviewStatusStyles[status]}>{status}</Badge>;
}

export function EvaluationResultPill({ result }: { result: EvaluationResult }) {
  return <Badge color={evaluationResultStyles[result]}>{result}</Badge>;
}
