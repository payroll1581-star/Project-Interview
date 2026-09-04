import { Users, CalendarClock, ClipboardCheck, Award } from 'lucide-react';
import { useAppData } from '../context/useAppData';
import { StatCard } from '../components/dashboard/StatCard';
import { StatusFunnel } from '../components/dashboard/StatusFunnel';
import { InterviewList } from '../components/interviews/InterviewList';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export function DashboardPage() {
  const { candidates, interviewsThisWeek, upcomingInterviews, candidateStatusCounts } = useAppData();
  const offers = candidateStatusCounts.Offer;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total candidates" value={candidates.length} icon={Users} />
        <StatCard label="Interviews this week" value={interviewsThisWeek.length} icon={CalendarClock} />
        <StatCard label="Upcoming interviews" value={upcomingInterviews.length} icon={ClipboardCheck} />
        <StatCard label="Offers extended" value={offers} icon={Award} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Candidate pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusFunnel counts={candidateStatusCounts} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming interviews</CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <InterviewList interviews={upcomingInterviews.slice(0, 5)} emptyMessage="No upcoming interviews scheduled." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
