import { createContext } from 'react';
import type { Candidate, CandidateStatus, Interview } from '../types';

export interface AppDataContextValue {
  candidates: Candidate[];
  interviews: Interview[];
  addCandidate: (input: Omit<Candidate, 'id' | 'createdAt'>) => Candidate;
  updateCandidate: (id: string, patch: Partial<Candidate>) => void;
  updateCandidateStatus: (id: string, status: CandidateStatus) => void;
  getCandidateById: (id: string) => Candidate | undefined;
  scheduleInterview: (input: Omit<Interview, 'id' | 'status'>) => Interview;
  updateInterview: (id: string, patch: Partial<Interview>) => void;
  cancelInterview: (id: string) => void;
  completeInterview: (id: string, feedback?: { rating?: number; notes?: string }) => void;
  getInterviewsForCandidate: (candidateId: string) => Interview[];
  upcomingInterviews: Interview[];
  interviewsThisWeek: Interview[];
  candidateStatusCounts: Record<CandidateStatus, number>;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);
