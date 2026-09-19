import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useAppData } from '../../context/useAppData';
import { ResumeLink } from '../ui/ResumeLink';
import { Button } from '../ui/Button';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function ResumeUpload({ candidateId, resumeUrl }: { candidateId: string; resumeUrl: string | undefined }) {
  const { uploadResume, removeResume } = useAppData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      setError('Only PDF, DOC, or DOCX files are allowed.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('File must be 5MB or smaller.');
      return;
    }

    setError(null);
    setIsBusy(true);
    try {
      await uploadResume(candidateId, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload resume.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove this resume?')) return;
    setError(null);
    setIsBusy(true);
    try {
      await removeResume(candidateId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove resume.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div>
      <p className="text-xs text-slate-400">Resume</p>
      <div className="flex flex-wrap items-center gap-3 pt-0.5">
        {resumeUrl ? (
          <>
            <ResumeLink url={resumeUrl} />
            <Button size="sm" variant="secondary" disabled={isBusy} onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button size="sm" variant="ghost" disabled={isBusy} onClick={handleRemove}>
              <X size={14} />
              Remove
            </Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" disabled={isBusy} onClick={() => inputRef.current?.click()}>
            <Upload size={14} />
            {isBusy ? 'Uploading…' : 'Upload resume'}
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="pt-1 text-xs text-red-600">{error}</p>}
      <p className="pt-1 text-[11px] text-slate-400">PDF, DOC, or DOCX. Max 5MB.</p>
    </div>
  );
}
