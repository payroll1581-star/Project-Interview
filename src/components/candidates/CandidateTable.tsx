import { useNavigate } from 'react-router';
import { Users } from 'lucide-react';
import type { Candidate } from '../../types';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../ui/Table';
import { CandidateStatusPill } from '../ui/StatusPill';
import { EmptyState } from '../ui/EmptyState';
import { formatDate } from '../../lib/date';

export function CandidateTable({ candidates }: { candidates: Candidate[] }) {
  const navigate = useNavigate();

  if (candidates.length === 0) {
    return <EmptyState icon={Users} message="No candidates match your filters." />;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Position</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Contact</TableHeaderCell>
          <TableHeaderCell>Applied</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {candidates.map((candidate) => (
          <TableRow
            key={candidate.id}
            className="cursor-pointer hover:bg-slate-50"
            onClick={() => navigate(`/candidates/${candidate.id}`)}
          >
            <TableCell className="font-medium text-slate-900">{candidate.name}</TableCell>
            <TableCell>{candidate.position}</TableCell>
            <TableCell>
              <CandidateStatusPill status={candidate.status} />
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span>{candidate.email}</span>
                <span className="text-xs text-slate-400">{candidate.phone}</span>
              </div>
            </TableCell>
            <TableCell>{formatDate(candidate.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
