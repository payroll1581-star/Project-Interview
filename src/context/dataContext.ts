import { createContext } from 'react';
import type { AppUser, Candidate, CandidateStatus, EvaluationSection, Interview } from '../types';

export interface EvaluationSubmission {
  scores: { criterionId: string; score: number }[];
  notes?: string;
  interviewerSignature: string;
  interviewerPosition?: string;
}

export interface NotifyRecipientResult {
  email: string;
  status: 'sent' | 'logged' | 'failed';
  error?: string;
}

export interface InterviewTrendPoint {
  month: string;
  [position: string]: number | string;
}

export interface InterviewTrend {
  data: InterviewTrendPoint[];
  positions: string[];
}

export interface AppDataContextValue {
  candidates: Candidate[];
  interviews: Interview[];
  users: AppUser[];
  interviewers: AppUser[];
  evaluationTemplate: EvaluationSection[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clear: () => void;
  addCandidate: (input: Omit<Candidate, 'id' | 'createdAt'>) => Promise<Candidate>;
  updateCandidate: (id: string, patch: Partial<Candidate>) => Promise<void>;
  updateCandidateStatus: (id: string, status: CandidateStatus) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  uploadResume: (candidateId: string, file: File) => Promise<void>;
  removeResume: (candidateId: string) => Promise<void>;
  getCandidateById: (id: string) => Candidate | undefined;
  scheduleInterview: (input: Omit<Interview, 'id' | 'status'>) => Promise<Interview>;
  updateInterview: (id: string, patch: Partial<Interview>) => Promise<void>;
  cancelInterview: (id: string) => Promise<void>;
  notifyInterview: (id: string, message?: string) => Promise<{ results: NotifyRecipientResult[] }>;
  completeInterview: (id: string, evaluation: EvaluationSubmission) => Promise<void>;
  getInterviewsForCandidate: (candidateId: string) => Interview[];
  getInterviewsForInterviewer: (interviewerId: string) => Interview[];
  getUserById: (id: string) => AppUser | undefined;
  addInterviewer: (input: { name: string; email: string; password: string; position?: string }) => Promise<AppUser>;
  removeInterviewer: (id: string) => Promise<void>;
  revokeUserSessions: (id: string) => Promise<void>;
  addEvaluationSection: (name: string) => Promise<void>;
  renameEvaluationSection: (id: string, name: string) => Promise<void>;
  removeEvaluationSection: (id: string) => Promise<void>;
  addEvaluationCriterion: (sectionId: string, name: string) => Promise<void>;
  renameEvaluationCriterion: (id: string, name: string) => Promise<void>;
  removeEvaluationCriterion: (id: string) => Promise<void>;
  upcomingInterviews: Interview[];
  interviewsThisWeek: Interview[];
  candidateStatusCounts: Record<CandidateStatus, number>;
  interviewTrendByPosition: InterviewTrend;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);
