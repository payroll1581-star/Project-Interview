import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAppData } from '../../context/useAppData';
import { formatDateTime } from '../../lib/date';

interface NotifyInterviewFormProps {
  open: boolean;
  onClose: () => void;
  interviewId: string;
}

export function NotifyInterviewForm({ open, onClose, interviewId }: NotifyInterviewFormProps) {
  return (
    <Modal open={open} onClose={onClose} title="Send Interview Notification" size="lg">
      {open && <NotifyForm onClose={onClose} interviewId={interviewId} />}
    </Modal>
  );
}

function NotifyForm({ onClose, interviewId }: { onClose: () => void; interviewId: string }) {
  const { interviews, getCandidateById, getUserById, notifyInterview } = useAppData();
  const interview = interviews.find((i) => i.id === interviewId);
  const candidate = interview ? getCandidateById(interview.candidateId) : undefined;
  const interviewers = interview
    ? interview.interviewerIds.map((id) => getUserById(id)).filter((u) => u !== undefined)
    : [];

  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ recipients: string[]; sent: boolean } | null>(null);

  async function handleSend() {
    setError(null);
    setIsSending(true);
    try {
      const outcome = await notifyInterview(interviewId, message.trim() || undefined);
      setResult(outcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSending(false);
    }
  }

  if (!interview) {
    return (
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-3 text-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Candidate</p>
          <p className="text-slate-800">{candidate?.name ?? 'Unknown candidate'}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Date &amp; Time</p>
          <p className="text-slate-800">{formatDateTime(interview.date)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Interviewer(s)</p>
          <p className="text-slate-800">
            {interviewers.length > 0
              ? interviewers.map((u) => `${u.name} <${u.email}>`).join(', ')
              : 'No interviewers assigned'}
          </p>
        </div>
      </div>

      <Textarea
        label="Message (optional)"
        rows={4}
        placeholder="Add any extra context for the interviewer(s)..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={result !== null}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <p className="text-sm text-emerald-700">
          {result.sent
            ? `Email sent to ${result.recipients.join(', ')}.`
            : `SMTP isn't configured yet, so the email was logged on the server instead of sent (recipients: ${result.recipients.join(', ')}).`}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <Button type="button" disabled={interviewers.length === 0 || isSending} onClick={handleSend}>
            {isSending ? 'Sending…' : 'Send notification'}
          </Button>
        )}
      </div>
    </div>
  );
}
