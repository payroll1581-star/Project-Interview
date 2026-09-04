import { Star } from 'lucide-react';
import clsx from 'clsx';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
}

export function StarRating({ value, onChange, max = 5, size = 18 }: StarRatingProps) {
  const readOnly = !onChange;

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${value} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={clsx(
            'text-amber-400 disabled:cursor-default',
            !readOnly && 'cursor-pointer transition-transform hover:scale-110',
          )}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <Star size={size} fill={star <= value ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
