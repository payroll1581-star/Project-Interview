import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useAppData } from '../../context/useAppData';
import { Button } from '../ui/Button';

export function DataErrorBanner() {
  const { error, refresh } = useAppData();
  const [isRetrying, setIsRetrying] = useState(false);

  if (!error) return null;

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await refresh();
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-red-200 bg-red-50 px-6 py-2.5 text-sm text-red-800">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="shrink-0" />
        <span>Couldn&apos;t load the latest data: {error}. What you see below may be out of date.</span>
      </div>
      <Button size="sm" variant="secondary" disabled={isRetrying} onClick={handleRetry}>
        {isRetrying ? 'Retrying…' : 'Retry'}
      </Button>
    </div>
  );
}
