import type { LucideIcon } from 'lucide-react';
import type { BadgeColor } from '../ui/badgeStyles';
import { colorClasses } from '../ui/badgeStyles';
import { Card, CardContent } from '../ui/Card';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  hint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: BadgeColor;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${colorClasses[tone]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
          {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
