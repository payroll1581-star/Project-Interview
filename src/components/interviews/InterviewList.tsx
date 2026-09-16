import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarClock } from 'lucide-react';
import type { Interview } from '../../types';
import { useAppData } from '../../context/useAppData';
import { useAuth } from '../../context/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../ui/Table';
import { InterviewStatusPill, EvaluationResultPill } from '../ui/StatusPill';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { ResumeLink } from '../ui/ResumeLink';
import { CompleteInterviewForm } from './CompleteInterviewForm';
import { formatDateTime, formatShortDateTime } from '../../lib/date';

export function InterviewList({
  interviews,
  showCandidate = true,
  compact = false,
  emptyMessage = 'No interviews to show.',
}: {
  interviews: Interview[];
  showCandidate?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}) {
  const { getCandidateById, getUserById, cancelInterview } = useAppData();
  const { currentUser } = useAuth();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const isAdmin = currentUser?.role === 'admin';

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      await cancelInterview(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setCancellingId(null);
    }
  }

  if (interviews.length === 0) {
    return <EmptyState icon={CalendarClock} message={emptyMessage} />;
  }

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            {showCandidate && <TableHeaderCell>Candidate</TableHeaderCell>}
            <TableHeaderCell>When</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Interviewers</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            {!compact && <TableHeaderCell>Evaluation</TableHeaderCell>}
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {interviews.map((interview) => {
            const candidate = getCandidateById(interview.candidateId);
            const interviewerNames = interview.interviewerIds
              .map((id) => getUserById(id)?.name ?? 'Unknown')
              .join(', ');
            const canComplete = isAdmin || (currentUser && interview.interviewerIds.includes(currentUser.id));
            return (
              <TableRow key={interview.id}>
                {showCandidate && (
                  <TableCell className="font-medium text-slate-900">
                    {candidate?.name ?? 'Unknown candidate'}
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap">
                  {compact ? formatShortDateTime(interview.date) : formatDateTime(interview.date)}
                </TableCell>
                <TableCell>{interview.type}</TableCell>
                <TableCell>
                  {compact ? (
                    <span className="block max-w-[7rem] truncate" title={interviewerNames}>
                      {interviewerNames}
                    </span>
                  ) : (
                    interviewerNames
                  )}
                </TableCell>
                <TableCell>
                  <InterviewStatusPill status={interview.status} />
                </TableCell>
                {!compact && (
                  <TableCell>
                    {interview.evaluation ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-xs font-medium text-slate-700">
                          {interview.evaluation.totalScore} / {interview.evaluation.maxScore}
                        </span>
                        <EvaluationResultPill result={interview.evaluation.result} />
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-3">
                    {interview.status === 'Scheduled' && (
                      <div className="flex gap-2">
                        {canComplete && (
                          <Button size="sm" variant="secondary" onClick={() => setCompletingId(interview.id)}>
                            Complete
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={cancellingId === interview.id}
                            onClick={() => handleCancel(interview.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    )}
                    <ResumeLink url={candidate?.resumeUrl} variant="compact" />
                    {interview.evaluation && (
                      <Link
                        to={`/candidates/${interview.candidateId}/interviews/${interview.id}/appraisal`}
                        className="text-xs font-medium text-indigo-600 hover:underline"
                      >
                        View report
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <CompleteInterviewForm
        open={completingId !== null}
        onClose={() => setCompletingId(null)}
        interviewId={completingId ?? ''}
      />
    </>
  );
}
