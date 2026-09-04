import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { StarRating } from '../ui/StarRating';
import { useAppData } from '../../context/useAppData';

interface CompleteInterviewFormProps {
  open: boolean;
  onClose: () => void;
  interviewId: string;
}

export function CompleteInterviewForm({ open, onClose, interviewId }: CompleteInterviewFormProps) {
  return (
    <Modal open={open} onClose={onClose} title="Complete Interview">
      {open && <CompleteForm onClose={onClose} interviewId={interviewId} />}
    </Modal>
  );
}

function CompleteForm({ onClose, interviewId }: { onClose: () => void; interviewId: string }) {
  const { completeInterview } = useAppData();
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    completeInterview(interviewId, {
      rating: rating || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-700">Candidate rating</p>
        <StarRating value={rating} onChange={setRating} />
      </div>
      <Textarea
        label="Feedback notes"
        rows={4}
        placeholder="How did the candidate perform?"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save &amp; complete</Button>
      </div>
    </form>
  );
}
