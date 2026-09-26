import { Fragment, useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { ScoreGridHeader, ScoreGridRow } from '../ui/ScoreGrid';
import { CircularGauge } from '../ui/CircularGauge';
import { EvaluationResultPill } from '../ui/StatusPill';
import { ResumeLink } from '../ui/ResumeLink';
import { strokeColorClasses } from '../ui/badgeStyles';
import { useAppData } from '../../context/useAppData';
import { useAuth } from '../../context/useAuth';
import { computeEvaluationResult, evaluationResultGuide, evaluationResultStyles } from '../../lib/status';
import { formatDate } from '../../lib/date';

interface CompleteInterviewFormProps {
  open: boolean;
  onClose: () => void;
  interviewId: string;
}

export function CompleteInterviewForm({ open, onClose, interviewId }: CompleteInterviewFormProps) {
  return (
    <Modal open={open} onClose={onClose} title="Complete Interview" size="2xl" expandable>
      {open && <CompleteForm onClose={onClose} interviewId={interviewId} />}
    </Modal>
  );
}

function CompleteForm({ onClose, interviewId }: { onClose: () => void; interviewId: string }) {
  const { interviews, getCandidateById, getUserById, evaluationTemplate, completeInterview } = useAppData();
  const { currentUser } = useAuth();
  const interview = interviews.find((i) => i.id === interviewId);
  const candidate = interview ? getCandidateById(interview.candidateId) : undefined;
  const interviewerNames = interview
    ? interview.interviewerIds.map((id) => getUserById(id)?.name ?? 'Unknown').join(', ')
    : '';

  const allCriteria = evaluationTemplate.flatMap((section) => section.criteria);

  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(allCriteria.map((c) => [c.id, 0])),
  );
  const [signature, setSignature] = useState(currentUser?.name ?? '');
  const [interviewerPosition, setInterviewerPosition] = useState(currentUser?.position ?? '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalScore = allCriteria.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0);
  const maxScore = allCriteria.length * 5;
  const liveResult = computeEvaluationResult(totalScore, maxScore);
  const livePercent = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const isComplete =
    allCriteria.length > 0 && allCriteria.every((c) => (scores[c.id] ?? 0) > 0) && signature.trim() !== '';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isComplete) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await completeInterview(interviewId, {
        scores: allCriteria.map((c) => ({ criterionId: c.id, score: scores[c.id] })),
        notes: notes.trim() || undefined,
        interviewerSignature: signature.trim(),
        interviewerPosition: interviewerPosition.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (allCriteria.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
          No evaluation criteria are configured yet. Ask an admin to set some up on the Evaluation Criteria
          page.
        </p>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {interview && (
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-3 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Candidate Name</p>
            <p className="text-slate-800">{candidate?.name ?? 'Unknown candidate'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Position</p>
            <p className="text-slate-800">{candidate?.position ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Date</p>
            <p className="text-slate-800">{formatDate(interview.date)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Interview By</p>
            <p className="text-slate-800">{interviewerNames}</p>
          </div>
          <ResumeLink url={candidate?.resumeUrl} className="col-span-2" />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="divide-y divide-slate-200">
          <ScoreGridHeader />
          {evaluationTemplate.map((section) => (
            <Fragment key={section.id}>
              <p className="bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {section.name}
              </p>
              {section.criteria.map((criterion) => (
                <ScoreGridRow
                  key={criterion.id}
                  label={criterion.name}
                  value={scores[criterion.id] ?? 0}
                  onChange={(value) => setScores((prev) => ({ ...prev, [criterion.id]: value }))}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-4 flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Evaluation</p>
          <p className="text-lg font-semibold text-slate-800">
            {totalScore} <span className="text-sm font-normal text-slate-400">/ {maxScore}</span>
          </p>
          <div className="mt-1">
            <EvaluationResultPill result={liveResult} />
          </div>
        </div>
        <CircularGauge percent={livePercent} strokeClassName={strokeColorClasses[evaluationResultStyles[liveResult]]}>
          <span className="text-sm font-semibold text-slate-700">{Math.round(livePercent)}%</span>
        </CircularGauge>
      </div>
      <p className="text-[11px] text-slate-400">Guide: {evaluationResultGuide}</p>

      <Input
        label="Interviewer Signature"
        required
        value={signature}
        onChange={(e) => setSignature(e.target.value)}
      />
      <Input
        label="Interviewer Position"
        value={interviewerPosition}
        onChange={(e) => setInterviewerPosition(e.target.value)}
      />

      <Textarea
        label="Other Comment"
        rows={4}
        placeholder="How did the candidate perform?"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isComplete || isSubmitting}>
          Save &amp; complete
        </Button>
      </div>
    </form>
  );
}
