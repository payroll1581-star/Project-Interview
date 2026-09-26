import { Users, CalendarClock, ClipboardCheck, Award } from 'lucide-react';
import { useAppData } from '../context/useAppData';
import { InterviewTrendChart } from '../components/dashboard/InterviewTrendChart';
import { StatCard } from '../components/dashboard/StatCard';
import { StatusFunnel } from '../components/dashboard/StatusFunnel';
import { InterviewList } from '../components/interviews/InterviewList';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatDate } from '../lib/date';

export function DashboardPage() {
  const { candidates, interviewsThisWeek, upcomingInterviews, candidateStatusCounts, interviewTrendByPosition } =
    useAppData();
  const offers = candidateStatusCounts.Offer;
  const offerRate = candidates.length > 0 ? Math.round((offers / candidates.length) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 xl:gap-8">
      <p className="text-sm text-slate-500">Overview of hiring activity as of {formatDate(new Date().toISOString())}.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 xl:gap-6">
        <StatCard label="Total candidates" value={candidates.length} icon={Users} tone="blue" />
        <StatCard label="Interviews this week" value={interviewsThisWeek.length} icon={CalendarClock} tone="violet" />
        <StatCard label="Upcoming interviews" value={upcomingInterviews.length} icon={ClipboardCheck} tone="amber" />
        <StatCard
          label="Offers extended"
          value={offers}
          icon={Award}
          tone="emerald"
          hint={`${offerRate}% of pipeline`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[22rem_minmax(0,1fr)] 2xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Candidate pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusFunnel counts={candidateStatusCounts} />
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Upcoming interviews</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              การสัมภาษณ์ที่นัดหมายไว้และยังไม่ถึงกำหนด เรียงจากใกล้ที่สุด แสดงสูงสุด 5 รายการ
            </p>
          </CardHeader>
          <CardContent>
            <div className="-mx-5">
              <InterviewList
                interviews={upcomingInterviews.slice(0, 5)}
                compact
                emptyMessage="No upcoming interviews scheduled."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interview trend by position</CardTitle>
        </CardHeader>
        <CardContent>
          <InterviewTrendChart trend={interviewTrendByPosition} />
        </CardContent>
      </Card>
    </div>
  );
}
