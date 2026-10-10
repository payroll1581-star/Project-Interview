import { useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { useAppData } from '../../context/useAppData';
import { Button } from '../ui/Button';
import { validateMrfFile } from '../../lib/mrf';
import type { AppUser } from '../../types';

// Edit-mode counterpart of MrfFileInput: shows the stored form and uploads/removes it immediately.
export function MrfManager({ interviewer }: { interviewer: AppUser }) {
  const { uploadInterviewerMrf, removeInterviewerMrf } = useAppData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = validateMrfFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      await uploadInterviewerMrf(interviewer.id, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload the file.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove this Manpower Requisition Form?')) return;
    setError(null);
    setIsBusy(true);
    try {
      await removeInterviewerMrf(interviewer.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove the file.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-1 block text-xs font-medium text-slate-700">Manpower Requisition Form (PDF)</p>
      <div className="flex flex-wrap items-center gap-2">
        {interviewer.mrfUrl ? (
          <>
            <a
              href={interviewer.mrfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
            >
              <FileText size={14} />
              View PDF
            </a>
            <Button type="button" size="sm" variant="secondary" disabled={isBusy} onClick={() => inputRef.current?.click()}>
              {isBusy ? 'Uploading…' : 'Replace'}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={handleRemove}>
              <X size={14} />
              Remove
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" variant="secondary" disabled={isBusy} onClick={() => inputRef.current?.click()}>
            <Upload size={14} />
            {isBusy ? 'Uploading…' : 'Upload PDF'}
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error ? (
        <p className="pt-1 text-xs text-red-600">{error}</p>
      ) : (
        <p className="pt-1 text-xs text-slate-500">PDF only. Max 5MB. Only admins can open this file.</p>
      )}
    </div>
  );
}
