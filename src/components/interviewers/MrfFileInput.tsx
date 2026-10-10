import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { validateMrfFile } from '../../lib/mrf';

interface MrfFileInputProps {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

// Picker for the optional Manpower Requisition Form on the Add Interviewer form.
export function MrfFileInput({ id, file, onChange, disabled }: MrfFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    const problem = validateMrfFile(picked);
    setError(problem);
    if (!problem) onChange(picked);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-700">
        Manpower Requisition Form (PDF, optional)
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={disabled}
          onChange={handleChange}
        />
        <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
          {file ? 'Choose another PDF' : 'Choose PDF'}
        </Button>
        {file && (
          <span className="flex items-center gap-1 text-sm text-slate-700">
            <span className="max-w-[16rem] truncate">{file.name}</span>
            <button
              type="button"
              aria-label="Remove selected file"
              className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              disabled={disabled}
              onClick={() => {
                setError(null);
                onChange(null);
              }}
            >
              <X size={14} />
            </button>
          </span>
        )}
      </div>
      {error ? (
        <p className="pt-1 text-xs text-red-600">{error}</p>
      ) : (
        <p className="pt-1 text-xs text-slate-500">PDF only. Max 5MB. Only admins can open this file.</p>
      )}
    </div>
  );
}
