import { type ReactNode } from 'react';
import clsx from 'clsx';

interface CircularGaugeProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  strokeClassName?: string;
  children?: ReactNode;
}

export function CircularGauge({
  percent,
  size = 72,
  strokeWidth = 7,
  strokeClassName = 'stroke-indigo-600',
  children,
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx('fill-none transition-[stroke-dashoffset] duration-300 ease-out', strokeClassName)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
