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
  const { candidates, scheduleInterview } = useAppData();
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidateId ?? '');
  const [interviewers, setInterviewers] = useState('');
  const [dateTime, setDateTime] = useState(defaultDateTime);
  const [duration, setDuration] = useState(45);
  const [type, setType] = useState<InterviewType>('Technical');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCandidateId) return;
    const isoDate = new Date(`${dateTime.date}T${dateTime.time}`).toISOString();
    scheduleInterview({
      candidateId: selectedCandidateId,
      interviewers: interviewers
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean),
      date: isoDate,
      durationMinutes: duration,
      type,
      location: location || undefined,
      notes: notes || undefined,
    });
    onClose();
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
      <Input
        label="Interviewer(s), comma separated"
        value={interviewers}
        onChange={(e) => setInterviewers(e.target.value)}
        placeholder="e.g. Priya Nair, Sam Osei"
      />
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
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Schedule interview</Button>
      </div>
    </form>
  );
}
