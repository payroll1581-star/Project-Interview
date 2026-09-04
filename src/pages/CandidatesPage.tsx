import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useAppData } from '../context/useAppData';
import { CandidateTable } from '../components/candidates/CandidateTable';
import { CandidateFormModal } from '../components/candidates/CandidateFormModal';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { candidateStatusOptions } from '../lib/status';
import type { CandidateStatus } from '../types';

export function CandidatesPage() {
  const { candidates } = useAppData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | 'All'>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [candidates, search, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-lg border-0 py-2 pl-8 pr-3 text-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CandidateStatus | 'All')}
            className="rounded-lg border-0 bg-white py-2 px-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
          >
            <option value="All">All statuses</option>
            {candidateStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus size={16} />
          Add Candidate
        </Button>
      </div>

      <Card>
        <CardContent className="px-0 py-0">
          <CandidateTable candidates={filtered} />
        </CardContent>
      </Card>

      <CandidateFormModal open={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}
