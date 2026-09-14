import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input, Select, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { candidateStatusOptions } from '../../lib/status';
import { useAppData } from '../../context/useAppData';
import type { Candidate, CandidateStatus } from '../../types';

interface CandidateFormModalProps {
  open: boolean;
  onClose: () => void;
  candidate?: Candidate;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  position: string;
  status: CandidateStatus;
  resumeUrl: string;
  notes: string;
}

const emptyForm: FormState = {
  name: '',
  email: '',
  phone: '',
  position: '',
  status: 'Applied',
  resumeUrl: '',
  notes: '',
};

function toFormState(candidate?: Candidate): FormState {
  if (!candidate) return emptyForm;
  return {
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    position: candidate.position,
    status: candidate.status,
    resumeUrl: candidate.resumeUrl ?? '',
    notes: candidate.notes ?? '',
  };
}

export function CandidateFormModal({ open, onClose, candidate }: CandidateFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={candidate ? 'Edit Candidate' : 'Add Candidate'}>
      {open && <CandidateForm onClose={onClose} candidate={candidate} />}
    </Modal>
  );
}

function CandidateForm({ onClose, candidate }: { onClose: () => void; candidate?: Candidate }) {
  const { addCandidate, updateCandidate } = useAppData();
  const [form, setForm] = useState<FormState>(() => toFormState(candidate));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      position: form.position,
      status: form.status,
      resumeUrl: form.resumeUrl || undefined,
      notes: form.notes || undefined,
    };
    setError(null);
    setIsSubmitting(true);
    try {
      if (candidate) {
        await updateCandidate(candidate.id, payload);
      } else {
        await addCandidate(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Input
        label="Full name"
        required
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Position"
          required
          value={form.position}
          onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CandidateStatus }))}
        >
          {candidateStatusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </div>
      <Input
        label="Resume URL"
        value={form.resumeUrl}
        onChange={(e) => setForm((f) => ({ ...f, resumeUrl: e.target.value }))}
      />
      <Textarea
        label="Notes"
        rows={3}
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {candidate ? 'Save changes' : 'Add candidate'}
        </Button>
      </div>
    </form>
  );
}
