export type InterviewType = 'Phone' | 'Technical' | 'Onsite' | 'Final';

export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export interface Interview {
  id: string;
  candidateId: string;
  interviewers: string[];
  date: string;
  durationMinutes: number;
  type: InterviewType;
  status: InterviewStatus;
  location?: string;
  notes?: string;
  rating?: number;
}
