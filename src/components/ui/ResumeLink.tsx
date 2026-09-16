import { FileText } from 'lucide-react';
import clsx from 'clsx';

interface ResumeLinkProps {
  url: string | undefined;
  variant?: 'default' | 'compact';
  className?: string;
}

export function ResumeLink({ url, variant = 'default', className }: ResumeLinkProps) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        'flex w-fit items-center gap-1.5 text-indigo-600 hover:underline',
        variant === 'default' ? 'text-sm' : 'text-xs font-medium',
        className,
      )}
    >
      {variant === 'default' && <FileText size={14} />}
      View resume
    </a>
  );
}
