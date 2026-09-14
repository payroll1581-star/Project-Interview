export type InterviewType = 'Phone' | 'Technical' | 'Onsite' | 'Final';

export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export type EvaluationResult = 'Hire' | 'Compare' | 'Reject';

export interface EvaluationScore {
  sectionName: string;
  criterionName: string;
  score: number;
}

export interface Evaluation {
  scores: EvaluationScore[];
  totalScore: number;
  maxScore: number;
  result: EvaluationResult;
  notes?: string;
  interviewerSignature?: string;
  interviewerPosition?: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  interviewerIds: string[];
  date: string;
  durationMinutes: number;
  type: InterviewType;
  status: InterviewStatus;
  location?: string;
  notes?: string;
  evaluation?: Evaluation;
}
