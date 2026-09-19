import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import { useAppData } from '../context/useAppData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ResumeLink } from '../components/ui/ResumeLink';
import { CandidateStatusSelect } from '../components/candidates/CandidateStatusSelect';
import { CandidateFormModal } from '../components/candidates/CandidateFormModal';
import { ScheduleInterviewForm } from '../components/interviews/ScheduleInterviewForm';
import { InterviewList } from '../components/interviews/InterviewList';
import { formatDate } from '../lib/date';

export function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { getCandidateById, getInterviewsForCandidate, deleteCandidate } = useAppData();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const candidate = candidateId ? getCandidateById(candidateId) : undefined;

  if (!candidate) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-slate-500">Candidate not found.</p>
        <Button variant="secondary" onClick={() => navigate('/candidates')}>
          <ArrowLeft size={16} />
          Back to candidates
        </Button>
      </div>
    );
  }

  const interviews = getInterviewsForCandidate(candidate.id);
  const scoreRatios = interviews
    .filter((i) => i.status === 'Completed' && i.evaluation)
    .map((i) => i.evaluation!.totalScore / i.evaluation!.maxScore);
  const avgScorePercent = scoreRatios.length
    ? (scoreRatios.reduce((sum, r) => sum + r, 0) / scoreRatios.length) * 100
    : null;

  const { id: confirmedCandidateId, name: candidateName } = candidate;

  async function handleDelete() {
    const warning =
      interviews.length > 0
        ? `Delete ${candidateName}? This will also remove ${interviews.length} associated interview(s). This cannot be undone.`
        : `Delete ${candidateName}? This cannot be undone.`;
    if (!window.confirm(warning)) return;

    setIsDeleting(true);
    try {
      await deleteCandidate(confirmedCandidateId);
      navigate('/candidates');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong.');
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate('/candidates')}
        className="flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Back to candidates
      </button>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>{candidate.name}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setIsEditOpen(true)}>
              <Pencil size={14} />
              Edit
            </Button>
            <Button size="sm" onClick={() => setIsScheduleOpen(true)}>
              <CalendarPlus size={14} />
              Schedule Interview
            </Button>
            <Button size="sm" variant="danger" disabled={isDeleting} onClick={handleDelete}>
              <Trash2 size={14} />
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Position</p>
              <p className="text-slate-800">{candidate.position}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-slate-800">{candidate.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Phone</p>
              <p className="text-slate-800">{candidate.phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Applied on</p>
              <p className="text-slate-800">{formatDate(candidate.createdAt)}</p>
            </div>
            <ResumeLink url={candidate.resumeUrl} />
            {candidate.notes && (
              <div>
                <p className="text-xs text-slate-400">Notes</p>
                <p className="text-slate-800">{candidate.notes}</p>
              </div>
            )}
          </div>
          <div className="max-w-xs">
            <CandidateStatusSelect candidateId={candidate.id} status={candidate.status} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Interview history</CardTitle>
          {avgScorePercent !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700">{avgScorePercent.toFixed(1)}%</span>
              <span className="text-xs text-slate-500">avg. of {scoreRatios.length} evaluated</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-0 py-0">
          <InterviewList
            interviews={interviews}
            showCandidate={false}
            emptyMessage="No interviews scheduled yet for this candidate."
          />
        </CardContent>
      </Card>

      <CandidateFormModal open={isEditOpen} onClose={() => setIsEditOpen(false)} candidate={candidate} />
      <ScheduleInterviewForm
        open={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        candidateId={candidate.id}
      />
    </div>
  );
}
