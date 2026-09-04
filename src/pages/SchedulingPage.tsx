import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppData } from '../context/useAppData';
import { InterviewList } from '../components/interviews/InterviewList';
import { ScheduleInterviewForm } from '../components/interviews/ScheduleInterviewForm';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { sortByDateAsc } from '../lib/date';
import type { InterviewStatus } from '../types';

const statusFilters: Array<InterviewStatus | 'All'> = ['All', 'Scheduled', 'Completed', 'Cancelled'];

export function SchedulingPage() {
  const { interviews } = useAppData();
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | 'All'>('All');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const filtered = useMemo(() => {
    const list = statusFilter === 'All' ? interviews : interviews.filter((i) => i.status === statusFilter);
    return sortByDateAsc(list);
  }, [interviews, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InterviewStatus | 'All')}
          className="rounded-lg border-0 bg-white py-2 px-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
        >
          {statusFilters.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <Button onClick={() => setIsScheduleOpen(true)}>
          <Plus size={16} />
          Schedule Interview
        </Button>
      </div>

      <Card>
        <CardContent className="px-0 py-0">
          <InterviewList interviews={filtered} />
        </CardContent>
      </Card>

      <ScheduleInterviewForm open={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} />
    </div>
  );
}
