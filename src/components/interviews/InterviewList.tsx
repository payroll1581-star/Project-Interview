import { CalendarClock } from 'lucide-react';
import type { Interview } from '../../types';
import { useAppData } from '../../context/useAppData';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../ui/Table';
import { InterviewStatusPill } from '../ui/StatusPill';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
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
  const { getCandidateById, cancelInterview, completeInterview } = useAppData();

  if (interviews.length === 0) {
    return <EmptyState icon={CalendarClock} message={emptyMessage} />;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          {showCandidate && <TableHeaderCell>Candidate</TableHeaderCell>}
          <TableHeaderCell>When</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Interviewers</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
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
                {interview.status === 'Scheduled' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => completeInterview(interview.id)}>
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
  );
}
