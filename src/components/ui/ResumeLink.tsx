import { useState } from 'react';
import { FileText } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../lib/api';

interface ResumeLinkProps {
  url: string | undefined;
  variant?: 'default' | 'compact';
  className?: string;
}

const linkClasses = (variant: 'default' | 'compact', className?: string) =>
  clsx(
    'flex w-fit items-center gap-1.5 text-indigo-600 hover:underline disabled:cursor-wait disabled:opacity-60',
    variant === 'default' ? 'text-sm' : 'text-xs font-medium',
    className,
  );

export function ResumeLink({ url, variant = 'default', className }: ResumeLinkProps) {
  const [isOpening, setIsOpening] = useState(false);

  if (!url) return null;

  // Uploaded files are served from an authenticated endpoint -- a plain <a href> can't
  // attach the bearer token, so fetch it as a blob and open that instead. External links
  // (pasted by an admin) work as a normal link.
  const isInternal = url.startsWith('/candidates/');

  if (!isInternal) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={linkClasses(variant, className)}>
        {variant === 'default' && <FileText size={14} />}
        View resume
      </a>
    );
  }

  async function handleOpen() {
    setIsOpening(true);
    try {
      const blob = await api.downloadBlob(url!);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to open resume.');
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <button type="button" disabled={isOpening} onClick={handleOpen} className={linkClasses(variant, className)}>
      {variant === 'default' && <FileText size={14} />}
      {isOpening ? 'Opening…' : 'View resume'}
    </button>
  );
}
