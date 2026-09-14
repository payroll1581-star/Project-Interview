import type { CandidateStatus } from '../../types';
import { candidateStatusOptions, candidateStatusStyles } from '../../lib/status';
import { solidColorClasses } from '../ui/badgeStyles';

export function StatusFunnel({ counts }: { counts: Record<CandidateStatus, number> }) {
  const max = Math.max(1, ...Object.values(counts));

  return (
    <div className="flex flex-col gap-3">
      {candidateStatusOptions.map((status) => (
        <div
          key={status}
          className="grid grid-cols-[6.5rem_1fr_1.75rem] items-center gap-3 sm:grid-cols-[8rem_1fr_1.75rem] lg:grid-cols-[9rem_1fr_2rem]"
        >
          <span className="truncate text-xs font-medium text-slate-600" title={status}>
            {status}
          </span>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${solidColorClasses[candidateStatusStyles[status]]}`}
              style={{ width: `${(counts[status] / max) * 100}%` }}
            />
          </div>
          <span className="text-right text-xs font-semibold tabular-nums text-slate-700">
            {counts[status]}
          </span>
        </div>
      ))}
    </div>
  );
}
