import type { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeColor = 'slate' | 'blue' | 'amber' | 'emerald' | 'red' | 'violet';

const colorClasses: Record<BadgeColor, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export function Badge({ color = 'slate', children }: { color?: BadgeColor; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        colorClasses[color],
      )}
    >
      {children}
    </span>
  );
}
