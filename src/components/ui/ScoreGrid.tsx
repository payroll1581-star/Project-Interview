import { Check } from 'lucide-react';
import clsx from 'clsx';

const SCORES = [5, 4, 3, 2, 1] as const;
const GRID_COLS = 'grid grid-cols-[1fr_repeat(5,2.75rem)] divide-x divide-slate-200';

export function ScoreGridHeader() {
  return (
    <div className={clsx(GRID_COLS, 'bg-slate-50')}>
      <span className="px-3 py-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Criterion</span>
      {SCORES.map((n) => (
        <span key={n} className="flex items-center justify-center py-2 text-base font-semibold text-slate-500">
          {n}
        </span>
      ))}
    </div>
  );
}

interface ScoreGridRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function ScoreGridRow({ label, value, onChange }: ScoreGridRowProps) {
  return (
    <div className={GRID_COLS} role="radiogroup" aria-label={label}>
      <p className="flex items-center px-3 py-2 text-sm font-medium text-slate-700">{label}</p>
      {SCORES.map((n) => {
        const checked = value === n;
        return (
          <div key={n} className="flex items-center justify-center py-2">
            <button
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${label}: ${n}`}
              onClick={() => onChange(n)}
              className={clsx(
                'flex h-7 w-7 items-center justify-center rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                checked
                  ? 'bg-indigo-600 text-white'
                  : 'text-transparent ring-1 ring-inset ring-slate-300 hover:ring-indigo-400',
              )}
            >
              <Check size={16} strokeWidth={3} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
