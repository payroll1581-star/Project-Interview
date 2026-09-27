import { Link } from 'react-router';
import clsx from 'clsx';
import { SelectableStepper, type SelectableStep } from '../ui/SelectableStepper';
import { EvaluationResultPill, InterviewStatusPill } from '../ui/StatusPill';
import { borderColorClasses } from '../ui/badgeStyles';
import { useAppData } from '../../context/useAppData';
import { evaluationResultStyles, interviewStatusStyles } from '../../lib/status';
import { interviewRounds, resolveSelectedInterview } from '../../lib/interviewRounds';
import { formatDateTime } from '../../lib/date';
import type { Interview } from '../../types';

interface InterviewRoundsPanelProps {
  interviews: Interview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function percentOf(interview: Interview): number | null {
  const { evaluation } = interview;
  return evaluation && evaluation.maxScore > 0 ? Math.round((evaluation.totalScore / evaluation.maxScore) * 100) : null;
}

function toStep(interview: Interview): SelectableStep {
  const { evaluation } = interview;
  const percent = percentOf(interview);
  return {
    key: interview.id,
    label: interview.type,
    detail: evaluation ? `${evaluation.result}${percent !== null ? ` · ${percent}%` : ''}` : interview.status,
    tone: evaluation ? evaluationResultStyles[evaluation.result] : interviewStatusStyles[interview.status],
  };
}

export function InterviewRoundsPanel({ interviews, selectedId, onSelect }: InterviewRoundsPanelProps) {
  const { getUserById } = useAppData();
  const rounds = interviewRounds(interviews);
  if (rounds.length < 2) return null;

  const selected = resolveSelectedInterview(interviews, selectedId);
  const interviewerNames = selected
    ? selected.interviewerIds.map((id) => getUserById(id)?.name ?? 'Unknown').join(', ')
    : '';

  const selectedTone = selected?.evaluation
    ? evaluationResultStyles[selected.evaluation.result]
    : selected
      ? interviewStatusStyles[selected.status]
      : undefined;

  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4">
      <SelectableStepper
        ariaLabel="Interview rounds"
        steps={rounds.map(toStep)}
        selectedKey={selected?.id}
        onSelect={onSelect}
      />

      {selected && selectedTone && (
        // The left accent bar echoes the selected step's outcome color, tying this panel back to
        // the step above it without needing to track the step's scroll position.
        <div aria-live="polite" className={clsx('border-l-4 pl-4 text-sm text-slate-700', borderColorClasses[selectedTone])}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-slate-900">{selected.type}</span>
            <span className="text-slate-500">{formatDateTime(selected.date)}</span>
            {selected.evaluation ? (
              <EvaluationResultPill result={selected.evaluation.result} />
            ) : (
              <InterviewStatusPill status={selected.status} />
            )}
          </div>

          {selected.evaluation ? (
            <>
              <p className="mt-2">
                Score {selected.evaluation.totalScore} / {selected.evaluation.maxScore}
                {percentOf(selected) !== null && ` (${percentOf(selected)}%)`}
                {interviewerNames && <span className="text-slate-500"> · Interviewer(s): {interviewerNames}</span>}
              </p>
              {selected.evaluation.notes && (
                <p className="mt-1 whitespace-pre-line text-slate-600">{selected.evaluation.notes}</p>
              )}
              <Link
                to={`/candidates/${selected.candidateId}/interviews/${selected.id}/appraisal`}
                className="mt-2 inline-block text-xs font-medium text-indigo-600 hover:underline"
              >
                View report
              </Link>
            </>
          ) : (
            <p className="mt-2 text-slate-500">
              {selected.status === 'Cancelled' ? 'Cancelled. There is no evaluation.' : 'Not evaluated yet.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
