import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAppData } from '../../context/useAppData';
import type { AppUser } from '../../types';

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  interviewer?: AppUser;
}

export function ResetPasswordModal({ open, onClose, interviewer }: ResetPasswordModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Reset password">
      {open && interviewer && <ResetPasswordForm onClose={onClose} interviewer={interviewer} />}
    </Modal>
  );
}

function ResetPasswordForm({ onClose, interviewer }: { onClose: () => void; interviewer: AppUser }) {
  const { resetInterviewerPassword } = useAppData();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await resetInterviewerPassword(interviewer.id, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          Password reset. {interviewer.name} was logged out of all devices. Share the new password with them:
        </p>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
          <p>
            <span className="font-medium">Email:</span> {interviewer.email}
          </p>
          <p>
            <span className="font-medium">New password:</span> {password}
          </p>
        </div>
        <div className="flex justify-end pt-1">
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <p className="text-sm text-slate-600">
        Set a new password for <span className="font-medium">{interviewer.name}</span>. They will be
        logged out of all devices.
      </p>
      <Input
        label="New password (at least 8 characters)"
        type="text"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Reset password
        </Button>
      </div>
    </form>
  );
}
