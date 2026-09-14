import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAppData } from '../../context/useAppData';
import type { AppUser } from '../../types';

interface InterviewerFormModalProps {
  open: boolean;
  onClose: () => void;
}

export function InterviewerFormModal({ open, onClose }: InterviewerFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Add Interviewer">
      {open && <InterviewerForm onClose={onClose} />}
    </Modal>
  );
}

function InterviewerForm({ onClose }: { onClose: () => void }) {
  const { addInterviewer } = useAppData();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [position, setPosition] = useState('');
  const [created, setCreated] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await addInterviewer({ name, email, password, position: position.trim() || undefined });
      setCreated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          Account created. Share these credentials with the interviewer so they can log in:
        </p>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
          <p>
            <span className="font-medium">Email:</span> {created.email}
          </p>
          <p>
            <span className="font-medium">Password:</span> {created.password}
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
      <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Password"
        type="text"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="Position"
        value={position}
        onChange={(e) => setPosition(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Add interviewer
        </Button>
      </div>
    </form>
  );
}
