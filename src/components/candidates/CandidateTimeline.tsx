import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { api } from '../../lib/api';
import { formatDate, formatTime } from '../../lib/date';
import { candidateStatusMessages, candidateStatusStyles } from '../../lib/status';
import { solidColorClasses } from '../ui/badgeStyles';
import { CandidateStatusPill } from '../ui/StatusPill';
import type { Candidate, CandidateStatus, CandidateStatusChange } from '../../types';

interface TimelineEvent {
  id: string;
  status: CandidateStatus;
  createdAt: string;
  actorName?: string;
}

function buildEvents(candidate: Candidate, changes: CandidateStatusChange[]): TimelineEvent[] {
  // History only exists for changes made since logging began, so the first entry is the
  // application itself, at whatever status it started with.
  const startStatus = changes[0]?.from ?? candidate.status;
  return [
    { id: 'created', status: startStatus, createdAt: candidate.createdAt },
    ...changes.map((c) => ({ id: c.id, status: c.to, createdAt: c.createdAt, actorName: c.actorName })),
  ];
}

export function CandidateTimeline({ candidate }: { candidate: Candidate }) {
  const [changes, setChanges] = useState<CandidateStatusChange[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { id: candidateId, status } = candidate;

  // Re-fetch whenever the status changes (including via interview complete/cancel).
  useEffect(() => {
    api
      .get<CandidateStatusChange[]>(`/candidates/${candidateId}/history`)
      .then((data) => {
        setChanges(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load history.'));
  }, [candidateId, status]);

  if (error) return <p className="px-5 py-4 text-sm text-red-600">{error}</p>;
  if (changes === null) return <p className="px-5 py-4 text-sm text-slate-400">Loading…</p>;

  const events = buildEvents(candidate, changes);

  return (
    <ol className="px-5 py-4">
      {events.map((event) => (
        <li key={event.id} className="flex gap-x-3">
          <div className="min-w-20 pt-0.5 text-end">
            <p className="text-xs font-medium text-slate-700">{formatDate(event.createdAt)}</p>
            <p className="text-xs text-slate-500">{formatTime(event.createdAt)}</p>
          </div>

          <div className="relative after:absolute after:top-7 after:bottom-0 after:left-3.5 after:-translate-x-[0.5px] after:border-s after:border-slate-200 last:after:hidden">
            <div className="relative z-10 flex size-7 items-center justify-center">
              <div className={clsx('size-2.5 rounded-full', solidColorClasses[candidateStatusStyles[event.status]])} />
            </div>
          </div>

          <div className="grow pt-0.5 pb-8 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-medium text-slate-800">{candidateStatusMessages[event.status]}</h4>
              <CandidateStatusPill status={event.status} />
            </div>
            {event.actorName && (
              <p className="mt-1 flex items-center gap-x-1.5 text-xs text-slate-500">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-medium text-slate-800 uppercase">
                  {event.actorName.charAt(0)}
                </span>
                {event.actorName}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
