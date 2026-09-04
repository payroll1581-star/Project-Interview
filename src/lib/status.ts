import type { CandidateStatus, InterviewStatus } from '../types';
import type { BadgeColor } from '../components/ui/Badge';

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
