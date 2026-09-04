import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import type { Interview } from '../../types';
import { useAppData } from '../../context/useAppData';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../ui/Table';
import { InterviewStatusPill } from '../ui/StatusPill';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { StarRating } from '../ui/StarRating';
import { CompleteInterviewForm } from './CompleteInterviewForm';
import { formatDateTime } from '../../lib/date';

export function InterviewList({
  interviews,
  showCandidate = true,
  emptyMessage = 'No interviews to show.',
}: {
  interviews: Interview[];
  showCandidate?: boolean;
  emptyMessage?: string;
}) {
  const { getCandidateById, cancelInterview } = useAppData();
  const [completingId, setCompletingId] = useState<string | null>(null);

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
            <TableHeaderCell>Rating</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {interviews.map((interview) => {
            const candidate = getCandidateById(interview.candidateId);
            return (
              <TableRow key={interview.id}>
                {showCandidate && (
                  <TableCell className="font-medium text-slate-900">
                    {candidate?.name ?? 'Unknown candidate'}
                  </TableCell>
                )}
                <TableCell>{formatDateTime(interview.date)}</TableCell>
                <TableCell>{interview.type}</TableCell>
                <TableCell>{interview.interviewers.join(', ')}</TableCell>
                <TableCell>
                  <InterviewStatusPill status={interview.status} />
                </TableCell>
                <TableCell>
                  {interview.rating ? (
                    <StarRating value={interview.rating} size={14} />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {interview.status === 'Scheduled' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setCompletingId(interview.id)}>
                        Complete
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => cancelInterview(interview.id)}>
                        Cancel
                      </Button>
                    </div>
                  )}
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
