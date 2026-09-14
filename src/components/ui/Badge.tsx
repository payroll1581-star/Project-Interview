import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { BadgeColor } from './badgeStyles';
import { colorClasses } from './badgeStyles';

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
