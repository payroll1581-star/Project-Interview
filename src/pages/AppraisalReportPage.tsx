import { Link, useParams } from 'react-router';
import { Printer, ArrowLeft } from 'lucide-react';
import { useAppData } from '../context/useAppData';
import { useAuth } from '../context/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EvaluationResultPill } from '../components/ui/StatusPill';
import { formatDateTime } from '../lib/date';
import type { EvaluationScore } from '../types';

function groupScoresBySection(scores: EvaluationScore[]): { sectionName: string; scores: EvaluationScore[] }[] {
  const groups: { sectionName: string; scores: EvaluationScore[] }[] = [];
  for (const score of scores) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.sectionName === score.sectionName) {
      lastGroup.scores.push(score);
    } else {
      groups.push({ sectionName: score.sectionName, scores: [score] });
    }
  }
  return groups;
}

export function AppraisalReportPage() {
  const { candidateId, interviewId } = useParams<{ candidateId: string; interviewId: string }>();
  const { getCandidateById, getUserById, interviews } = useAppData();
  const { currentUser } = useAuth();

  const candidate = candidateId ? getCandidateById(candidateId) : undefined;
  const interview = interviews.find((i) => i.id === interviewId && i.candidateId === candidateId);
  const evaluation = interview?.evaluation;
  const isOwnInterview =
    currentUser?.role === 'admin' ||
    (interview !== undefined && currentUser !== null && interview.interviewerIds.includes(currentUser.id));

  if (!candidate || !interview || !evaluation || !isOwnInterview) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center">
        <p className="text-sm text-slate-500">Report not available.</p>
        <Link
          to={candidateId ? `/candidates/${candidateId}` : '/candidates'}
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
        >
          <ArrowLeft size={16} />
          Back to candidate
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between print:hidden">
          <Link
            to={`/candidates/${candidate.id}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={16} />
            Back to candidate
          </Link>
          <Button size="sm" onClick={() => window.print()}>
            <Printer size={14} />
            Print
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interview Evaluation Form</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Candidate</p>
                <p className="font-medium text-slate-900">{candidate.name}</p>
                <p className="text-slate-600">{candidate.position}</p>
                <p className="text-slate-600">{candidate.email}</p>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Interview</p>
                <p className="text-slate-800">{formatDateTime(interview.date)}</p>
                <p className="text-slate-600">
                  {interview.type} &middot; {interview.durationMinutes} min
                </p>
                <p className="text-slate-600">
                  {interview.interviewerIds.map((id) => getUserById(id)?.name ?? 'Unknown').join(', ')}
                </p>
                {interview.room && <p className="text-slate-600">Room: {interview.room}</p>}
                {interview.location && <p className="text-slate-600">{interview.location}</p>}
              </div>
            </div>

            {groupScoresBySection(evaluation.scores).map((group) => (
              <div key={group.sectionName} className="flex flex-col gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {group.sectionName}
                </p>
                {group.scores.map((score, index) => (
                  <div key={`${score.criterionName}-${index}`} className="flex items-center justify-between text-sm">
                    <p className="text-slate-700">{score.criterionName}</p>
                    <span className="w-14 text-right text-xs text-slate-500">{score.score} / 5</span>
                  </div>
                ))}
              </div>
            ))}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm font-medium text-slate-800">
                Total Evaluation &nbsp;=&nbsp; {evaluation.totalScore} / {evaluation.maxScore}
              </span>
              <EvaluationResultPill result={evaluation.result} />
            </div>

            {(evaluation.interviewerSignature || evaluation.interviewerPosition) && (
              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                {evaluation.interviewerSignature && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Interviewer Signature
                    </p>
                    <p className="text-slate-800">{evaluation.interviewerSignature}</p>
                  </div>
                )}
                {evaluation.interviewerPosition && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Interviewer Position
                    </p>
                    <p className="text-slate-800">{evaluation.interviewerPosition}</p>
                  </div>
                )}
              </div>
            )}

            {evaluation.notes && (
              <div className="flex flex-col gap-1 border-t border-slate-100 pt-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Other Comment
                </p>
                <p className="text-slate-800">{evaluation.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
