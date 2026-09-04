import { useMemo, useReducer, type ReactNode } from 'react';
import type { Candidate, CandidateStatus, Interview } from '../types';
import { candidates as initialCandidates } from '../data/candidates';
import { interviews as initialInterviews } from '../data/interviews';
import { generateId } from '../lib/id';
import { isThisWeek, sortByDateAsc } from '../lib/date';
import { AppDataContext, type AppDataContextValue } from './dataContext';

interface State {
  candidates: Candidate[];
  interviews: Interview[];
}

type Action =
  | { type: 'ADD_CANDIDATE'; candidate: Candidate }
  | { type: 'UPDATE_CANDIDATE'; id: string; patch: Partial<Candidate> }
  | { type: 'ADD_INTERVIEW'; interview: Interview }
  | { type: 'UPDATE_INTERVIEW'; id: string; patch: Partial<Interview> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_CANDIDATE':
      return { ...state, candidates: [action.candidate, ...state.candidates] };
    case 'UPDATE_CANDIDATE':
      return {
        ...state,
        candidates: state.candidates.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      };
    case 'ADD_INTERVIEW':
      return { ...state, interviews: [action.interview, ...state.interviews] };
    case 'UPDATE_INTERVIEW':
      return {
        ...state,
        interviews: state.interviews.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
      };
    default:
      return state;
  }
}

const STATUS_LIST: CandidateStatus[] = [
  'Applied',
  'Screening',
  'Interview Scheduled',
  'Offer',
  'Rejected',
];

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    candidates: initialCandidates,
    interviews: initialInterviews,
  });

  const value = useMemo<AppDataContextValue>(() => {
    const getCandidateById = (id: string) => state.candidates.find((c) => c.id === id);

    const addCandidate: AppDataContextValue['addCandidate'] = (input) => {
      const candidate: Candidate = {
        ...input,
        id: generateId('c'),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_CANDIDATE', candidate });
      return candidate;
    };

    const updateCandidate: AppDataContextValue['updateCandidate'] = (id, patch) => {
      dispatch({ type: 'UPDATE_CANDIDATE', id, patch });
    };

    const updateCandidateStatus: AppDataContextValue['updateCandidateStatus'] = (id, status) => {
      dispatch({ type: 'UPDATE_CANDIDATE', id, patch: { status } });
    };

    const scheduleInterview: AppDataContextValue['scheduleInterview'] = (input) => {
      const interview: Interview = { ...input, id: generateId('i'), status: 'Scheduled' };
      dispatch({ type: 'ADD_INTERVIEW', interview });
      const candidate = getCandidateById(input.candidateId);
      if (candidate && candidate.status !== 'Offer' && candidate.status !== 'Rejected') {
        dispatch({ type: 'UPDATE_CANDIDATE', id: candidate.id, patch: { status: 'Interview Scheduled' } });
      }
      return interview;
    };

    const updateInterview: AppDataContextValue['updateInterview'] = (id, patch) => {
      dispatch({ type: 'UPDATE_INTERVIEW', id, patch });
    };

    const cancelInterview: AppDataContextValue['cancelInterview'] = (id) => {
      dispatch({ type: 'UPDATE_INTERVIEW', id, patch: { status: 'Cancelled' } });
    };

    const completeInterview: AppDataContextValue['completeInterview'] = (id, feedback) => {
      const patch: Partial<Interview> = { status: 'Completed' };
      if (feedback?.rating) patch.rating = feedback.rating;
      if (feedback?.notes) patch.notes = feedback.notes;
      dispatch({ type: 'UPDATE_INTERVIEW', id, patch });
    };

    const getInterviewsForCandidate = (candidateId: string) =>
      sortByDateAsc(state.interviews.filter((i) => i.candidateId === candidateId));

    const now = new Date();
    const upcomingInterviews = sortByDateAsc(
      state.interviews.filter((i) => i.status === 'Scheduled' && new Date(i.date) >= now),
    );
    const interviewsThisWeek = state.interviews.filter(
      (i) => i.status === 'Scheduled' && isThisWeek(i.date),
    );

    const candidateStatusCounts = STATUS_LIST.reduce(
      (acc, status) => {
        acc[status] = state.candidates.filter((c) => c.status === status).length;
        return acc;
      },
      {} as Record<CandidateStatus, number>,
    );

    return {
      candidates: state.candidates,
      interviews: state.interviews,
      addCandidate,
      updateCandidate,
      updateCandidateStatus,
      getCandidateById,
      scheduleInterview,
      updateInterview,
      cancelInterview,
      completeInterview,
      getInterviewsForCandidate,
      upcomingInterviews,
      interviewsThisWeek,
      candidateStatusCounts,
    };
  }, [state]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
