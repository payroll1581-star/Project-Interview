import { Badge } from './Badge';
import { candidateStatusStyles, interviewStatusStyles } from '../../lib/status';
import type { CandidateStatus, InterviewStatus } from '../../types';

export function CandidateStatusPill({ status }: { status: CandidateStatus }) {
  return <Badge color={candidateStatusStyles[status]}>{status}</Badge>;
}

export function InterviewStatusPill({ status }: { status: InterviewStatus }) {
  return <Badge color={interviewStatusStyles[status]}>{status}</Badge>;
}
