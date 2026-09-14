import { useCallback, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { AppUser, Candidate, CandidateStatus, EvaluationSection, Interview } from '../types';
import { api } from '../lib/api';
import { isThisWeek, sortByDateAsc } from '../lib/date';
import { AppDataContext, type AppDataContextValue } from './dataContext';

interface State {
  candidates: Candidate[];
  interviews: Interview[];
  users: AppUser[];
  evaluationTemplate: EvaluationSection[];
}

const initialState: State = { candidates: [], interviews: [], users: [], evaluationTemplate: [] };

type Action =
  | {
      type: 'SET_ALL';
      candidates: Candidate[];
      interviews: Interview[];
      users: AppUser[];
      evaluationTemplate: EvaluationSection[];
    }
  | { type: 'RESET' }
  | { type: 'ADD_CANDIDATE'; candidate: Candidate }
  | { type: 'UPDATE_CANDIDATE'; id: string; patch: Partial<Candidate> }
  | { type: 'ADD_INTERVIEW'; interview: Interview }
  | { type: 'UPDATE_INTERVIEW'; id: string; patch: Partial<Interview> }
  | { type: 'ADD_USER'; user: AppUser }
  | { type: 'REMOVE_USER'; id: string }
  | { type: 'SET_EVALUATION_TEMPLATE'; evaluationTemplate: EvaluationSection[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_ALL':
      return {
        candidates: action.candidates,
        interviews: action.interviews,
        users: action.users,
        evaluationTemplate: action.evaluationTemplate,
      };
    case 'RESET':
      return initialState;
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
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.user] };
    case 'REMOVE_USER':
      return { ...state, users: state.users.filter((u) => u.id !== action.id) };
    case 'SET_EVALUATION_TEMPLATE':
      return { ...state, evaluationTemplate: action.evaluationTemplate };
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
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [candidates, interviews, users, evaluationTemplate] = await Promise.all([
        api.get<Candidate[]>('/candidates'),
        api.get<Interview[]>('/interviews'),
        api.get<AppUser[]>('/users'),
        api.get<EvaluationSection[]>('/evaluation-template'),
      ]);
      dispatch({ type: 'SET_ALL', candidates, interviews, users, evaluationTemplate });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'RESET' });
    setError(null);
  }, []);

  const value = useMemo<AppDataContextValue>(() => {
    const getCandidateById = (id: string) => state.candidates.find((c) => c.id === id);
    const getUserById = (id: string) => state.users.find((u) => u.id === id);

    const addInterviewer: AppDataContextValue['addInterviewer'] = async (input) => {
      const user = await api.post<AppUser>('/users', input);
      const { password: _password, ...userWithoutPassword } = user;
      dispatch({ type: 'ADD_USER', user: userWithoutPassword });
      return user;
    };

    const removeInterviewer: AppDataContextValue['removeInterviewer'] = async (id) => {
      await api.delete(`/users/${id}`);
      dispatch({ type: 'REMOVE_USER', id });
    };

    const getInterviewsForInterviewer = (interviewerId: string) =>
      sortByDateAsc(state.interviews.filter((i) => i.interviewerIds.includes(interviewerId)));

    const addCandidate: AppDataContextValue['addCandidate'] = async (input) => {
      const candidate = await api.post<Candidate>('/candidates', input);
      dispatch({ type: 'ADD_CANDIDATE', candidate });
      return candidate;
    };

    const updateCandidate: AppDataContextValue['updateCandidate'] = async (id, patch) => {
      const candidate = await api.patch<Candidate>(`/candidates/${id}`, patch);
      dispatch({ type: 'UPDATE_CANDIDATE', id, patch: candidate });
    };

    const updateCandidateStatus: AppDataContextValue['updateCandidateStatus'] = async (id, status) => {
      const candidate = await api.patch<Candidate>(`/candidates/${id}`, { status });
      dispatch({ type: 'UPDATE_CANDIDATE', id, patch: candidate });
    };

    const scheduleInterview: AppDataContextValue['scheduleInterview'] = async (input) => {
      const result = await api.post<{ interview: Interview; candidate: Candidate }>('/interviews', input);
      dispatch({ type: 'ADD_INTERVIEW', interview: result.interview });
      dispatch({ type: 'UPDATE_CANDIDATE', id: result.candidate.id, patch: result.candidate });
      return result.interview;
    };

    const updateInterview: AppDataContextValue['updateInterview'] = async (id, patch) => {
      const interview = await api.patch<Interview>(`/interviews/${id}`, patch);
      dispatch({ type: 'UPDATE_INTERVIEW', id, patch: interview });
    };

    const cancelInterview: AppDataContextValue['cancelInterview'] = async (id) => {
      const interview = await api.post<Interview>(`/interviews/${id}/cancel`);
      dispatch({ type: 'UPDATE_INTERVIEW', id, patch: interview });
    };

    const completeInterview: AppDataContextValue['completeInterview'] = async (id, evaluation) => {
      const interview = await api.post<Interview>(`/interviews/${id}/complete`, { evaluation });
      dispatch({ type: 'UPDATE_INTERVIEW', id, patch: interview });
    };

    const getInterviewsForCandidate = (candidateId: string) =>
      sortByDateAsc(state.interviews.filter((i) => i.candidateId === candidateId));

    const addEvaluationSection: AppDataContextValue['addEvaluationSection'] = async (name) => {
      const evaluationTemplate = await api.post<EvaluationSection[]>('/evaluation-template/sections', { name });
      dispatch({ type: 'SET_EVALUATION_TEMPLATE', evaluationTemplate });
    };

    const renameEvaluationSection: AppDataContextValue['renameEvaluationSection'] = async (id, name) => {
      const evaluationTemplate = await api.patch<EvaluationSection[]>(`/evaluation-template/sections/${id}`, {
        name,
      });
      dispatch({ type: 'SET_EVALUATION_TEMPLATE', evaluationTemplate });
    };

    const removeEvaluationSection: AppDataContextValue['removeEvaluationSection'] = async (id) => {
      const evaluationTemplate = await api.delete<EvaluationSection[]>(`/evaluation-template/sections/${id}`);
      dispatch({ type: 'SET_EVALUATION_TEMPLATE', evaluationTemplate });
    };

    const addEvaluationCriterion: AppDataContextValue['addEvaluationCriterion'] = async (sectionId, name) => {
      const evaluationTemplate = await api.post<EvaluationSection[]>('/evaluation-template/criteria', {
        sectionId,
        name,
      });
      dispatch({ type: 'SET_EVALUATION_TEMPLATE', evaluationTemplate });
    };

    const renameEvaluationCriterion: AppDataContextValue['renameEvaluationCriterion'] = async (id, name) => {
      const evaluationTemplate = await api.patch<EvaluationSection[]>(`/evaluation-template/criteria/${id}`, {
        name,
      });
      dispatch({ type: 'SET_EVALUATION_TEMPLATE', evaluationTemplate });
    };

    const removeEvaluationCriterion: AppDataContextValue['removeEvaluationCriterion'] = async (id) => {
      const evaluationTemplate = await api.delete<EvaluationSection[]>(`/evaluation-template/criteria/${id}`);
      dispatch({ type: 'SET_EVALUATION_TEMPLATE', evaluationTemplate });
    };

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
      users: state.users,
      interviewers: state.users.filter((u) => u.role === 'interviewer'),
      evaluationTemplate: state.evaluationTemplate,
      isLoading,
      error,
      refresh,
      clear,
      addCandidate,
      updateCandidate,
      updateCandidateStatus,
      getCandidateById,
      scheduleInterview,
      updateInterview,
      cancelInterview,
      completeInterview,
      getInterviewsForCandidate,
      getInterviewsForInterviewer,
      getUserById,
      addInterviewer,
      removeInterviewer,
      addEvaluationSection,
      renameEvaluationSection,
      removeEvaluationSection,
      addEvaluationCriterion,
      renameEvaluationCriterion,
      removeEvaluationCriterion,
      upcomingInterviews,
      interviewsThisWeek,
      candidateStatusCounts,
    };
  }, [state, isLoading, error, refresh, clear]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
