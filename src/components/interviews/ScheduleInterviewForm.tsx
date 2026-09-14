import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input, Select, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { interviewTypeOptions } from '../../lib/status';
import { useAppData } from '../../context/useAppData';
import type { InterviewType } from '../../types';

interface ScheduleInterviewFormProps {
  open: boolean;
  onClose: () => void;
  candidateId?: string;
}

function defaultDateTime(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return { date: d.toISOString().slice(0, 10), time: '10:00' };
}

export function ScheduleInterviewForm({ open, onClose, candidateId }: ScheduleInterviewFormProps) {
  return (
    <Modal open={open} onClose={onClose} title="Schedule Interview">
      {open && <ScheduleForm onClose={onClose} candidateId={candidateId} />}
    </Modal>
  );
}

function ScheduleForm({ onClose, candidateId }: { onClose: () => void; candidateId?: string }) {
  const { candidates, interviewers, scheduleInterview } = useAppData();
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidateId ?? '');
  const [interviewerIds, setInterviewerIds] = useState<string[]>([]);
  const [dateTime, setDateTime] = useState(defaultDateTime);
  const [duration, setDuration] = useState(45);
  const [type, setType] = useState<InterviewType>('Technical');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleInterviewer(id: string) {
    setInterviewerIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCandidateId || interviewerIds.length === 0) return;
    const isoDate = new Date(`${dateTime.date}T${dateTime.time}`).toISOString();
    setError(null);
    setIsSubmitting(true);
    try {
      await scheduleInterview({
        candidateId: selectedCandidateId,
        interviewerIds,
        date: isoDate,
        durationMinutes: duration,
        type,
        location: location || undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Select
        label="Candidate"
        required
        disabled={Boolean(candidateId)}
        value={selectedCandidateId}
        onChange={(e) => setSelectedCandidateId(e.target.value)}
      >
        <option value="" disabled>
          Select a candidate
        </option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {c.position}
          </option>
        ))}
      </Select>
      <div>
        <p className="mb-1 block text-xs font-medium text-slate-700">Interviewer(s)</p>
        <div className="flex flex-col gap-1.5 rounded-lg ring-1 ring-inset ring-slate-300 px-3 py-2">
          {interviewers.length === 0 ? (
            <p className="text-sm text-slate-400">No interviewer accounts yet.</p>
          ) : (
            interviewers.map((interviewer) => (
              <label key={interviewer.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={interviewerIds.includes(interviewer.id)}
                  onChange={() => toggleInterviewer(interviewer.id)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                />
                {interviewer.name}
              </label>
            ))
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          required
          value={dateTime.date}
          onChange={(e) => setDateTime((d) => ({ ...d, date: e.target.value }))}
        />
        <Input
          label="Time"
          type="time"
          required
          value={dateTime.time}
          onChange={(e) => setDateTime((d) => ({ ...d, time: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Duration (minutes)"
          type="number"
          min={15}
          step={15}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value as InterviewType)}>
          {interviewTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </div>
      <Input label="Location / meeting link" value={location} onChange={(e) => setLocation(e.target.value)} />
      <Textarea label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Schedule interview
        </Button>
      </div>
    </form>
  );
}
