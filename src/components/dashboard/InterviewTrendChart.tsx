import { LineChart as LineChartIcon } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { InterviewTrend } from '../../context/dataContext';
import { EmptyState } from '../ui/EmptyState';

const LINE_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#0ea5e9', // sky
  '#f43f5e', // rose
  '#14b8a6', // teal
];

export function InterviewTrendChart({ trend }: { trend: InterviewTrend }) {
  if (trend.positions.length === 0) {
    return (
      <EmptyState icon={LineChartIcon} message="No completed interviews yet to chart a trend." />
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend.data} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {trend.positions.map((position, index) => (
            <Line
              key={position}
              type="monotone"
              dataKey={position}
              stroke={LINE_COLORS[index % LINE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
