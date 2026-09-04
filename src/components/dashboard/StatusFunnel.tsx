import type { CandidateStatus } from '../../types';
import { candidateStatusOptions, candidateStatusStyles } from '../../lib/status';

const barColorClasses: Record<string, string> = {
  slate: 'bg-slate-400',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
  violet: 'bg-violet-500',
};

export function StatusFunnel({ counts }: { counts: Record<CandidateStatus, number> }) {
  const max = Math.max(1, ...Object.values(counts));

  return (
    <div className="flex flex-col gap-3">
      {candidateStatusOptions.map((status) => (
        <div key={status} className="flex items-center gap-3">
          <span className="w-36 shrink-0 text-xs font-medium text-slate-600">{status}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${barColorClasses[candidateStatusStyles[status]]}`}
              style={{ width: `${(counts[status] / max) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-semibold text-slate-700">
            {counts[status]}
          </span>
        </div>
      ))}
    </div>
  );
}
