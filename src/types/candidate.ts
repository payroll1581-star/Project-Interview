export type CandidateStatus =
  | 'Applied'
  | 'Screening'
  | 'Interview Scheduled'
  | 'Offer'
  | 'Rejected';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  status: CandidateStatus;
  resumeUrl?: string;
  notes?: string;
  createdAt: string;
}
