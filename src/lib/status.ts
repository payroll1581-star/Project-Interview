import type { CandidateStatus, EvaluationResult, InterviewStatus } from '../types';
import type { BadgeColor } from '../components/ui/badgeStyles';
import { computeEvaluationResult as computeEvaluationResultUntyped } from './evaluationThresholds.js';

export const candidateStatusStyles: Record<CandidateStatus, BadgeColor> = {
  Applied: 'slate',
  Screening: 'blue',
  'Interview Scheduled': 'violet',
  Offer: 'emerald',
  Rejected: 'red',
};

export const interviewStatusStyles: Record<InterviewStatus, BadgeColor> = {
  Scheduled: 'blue',
  Completed: 'emerald',
  Cancelled: 'slate',
};

export const candidateStatusOptions: CandidateStatus[] = [
  'Applied',
  'Screening',
  'Interview Scheduled',
  'Offer',
  'Rejected',
];

export const interviewTypeOptions = ['Phone', 'Technical', 'Onsite', 'Final'] as const;

export const evaluationResultStyles: Record<EvaluationResult, BadgeColor> = {
  Hire: 'emerald',
  Compare: 'amber',
  Reject: 'red',
};

export function computeEvaluationResult(totalScore: number, maxScore: number): EvaluationResult {
  return computeEvaluationResultUntyped(totalScore, maxScore) as EvaluationResult;
}

export const evaluationResultGuide =
  '72% or higher to Hire · 60-71% to Compare with other applicants · below 60% to Reject.';
