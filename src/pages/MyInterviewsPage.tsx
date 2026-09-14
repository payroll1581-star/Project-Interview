import { useAppData } from '../context/useAppData';
import { useAuth } from '../context/useAuth';
import { InterviewList } from '../components/interviews/InterviewList';
import { Card, CardContent } from '../components/ui/Card';

export function MyInterviewsPage() {
  const { currentUser } = useAuth();
  const { getInterviewsForInterviewer } = useAppData();

  const interviews = currentUser ? getInterviewsForInterviewer(currentUser.id) : [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="px-0 py-0">
          <InterviewList interviews={interviews} emptyMessage="No interviews assigned to you." />
        </CardContent>
      </Card>
    </div>
  );
}
