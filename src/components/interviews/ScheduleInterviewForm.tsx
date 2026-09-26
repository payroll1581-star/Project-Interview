import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input, Select, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { interviewTypeOptions } from '../../lib/status';
import { useAppData } from '../../context/useAppData';
import { toDateTimeInputParts } from '../../lib/date';
import { ApiError } from '../../lib/api';
import type { Interview, InterviewType } from '../../types';

const ROOM_MAX_LENGTH = 100;

interface ScheduleInterviewFormProps {
  open: boolean;
  onClose: () => void;
  candidateId?: string;
  interview?: Interview;
}

function defaultDateTime(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return { date: d.toISOString().slice(0, 10), time: '10:00' };
}

export function ScheduleInterviewForm({ open, onClose, candidateId, interview }: ScheduleInterviewFormProps) {
  return (
    <Modal open={open} onClose={onClose} title={interview ? 'Edit Interview' : 'Schedule Interview'}>
      {open && <ScheduleForm onClose={onClose} candidateId={candidateId} interview={interview} />}
    </Modal>
  );
}

function ScheduleForm({
  onClose,
  candidateId,
  interview,
}: {
  onClose: () => void;
  candidateId?: string;
  interview?: Interview;
}) {
  const { candidates, interviewers, scheduleInterview, updateInterview, getUserById } = useAppData();
  const [selectedCandidateId, setSelectedCandidateId] = useState(interview?.candidateId ?? candidateId ?? '');
  const [interviewerIds, setInterviewerIds] = useState<string[]>(interview?.interviewerIds ?? []);
  const [dateTime, setDateTime] = useState(() =>
    interview ? toDateTimeInputParts(interview.date) : defaultDateTime(),
  );
  const [duration, setDuration] = useState(interview?.durationMinutes ?? 45);
  const [type, setType] = useState<InterviewType>(interview?.type ?? 'Technical');
  const [room, setRoom] = useState(interview?.room ?? '');
  const [location, setLocation] = useState(interview?.location ?? '');
  const [notes, setNotes] = useState(interview?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleInterviewer(id: string) {
    setInterviewerIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(false);
  }

  async function submit(allowConflict: boolean) {
    if (!selectedCandidateId || interviewerIds.length === 0) return;
    const isoDate = new Date(`${dateTime.date}T${dateTime.time}`).toISOString();
    setError(null);
    setConflict(null);
    setIsSubmitting(true);
    try {
      if (interview) {
        // Keep the stored timestamp when the date/time inputs are untouched, so saving an
        // unrelated edit never counts as a reschedule (the inputs only have minute precision).
        const original = toDateTimeInputParts(interview.date);
        const dateChanged = original.date !== dateTime.date || original.time !== dateTime.time;
        // Empty strings clear a field on PATCH (undefined would be dropped from the JSON body).
        await updateInterview(interview.id, {
          date: dateChanged ? isoDate : interview.date,
          durationMinutes: duration,
          type,
          room: room.trim(),
          location: location.trim(),
          notes: notes.trim(),
          ...(allowConflict ? { allowConflict: true } : {}),
        });
      } else {
        await scheduleInterview({
          candidateId: selectedCandidateId,
          interviewerIds,
          date: isoDate,
          durationMinutes: duration,
          type,
          room: room.trim() || undefined,
          location: location || undefined,
          notes: notes || undefined,
          ...(allowConflict ? { allowConflict: true } : {}),
        });
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'schedule_conflict') {
        setConflict(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Select
        label="Candidate"
        required
        disabled={Boolean(candidateId) || Boolean(interview)}
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
      {interview ? (
        <div>
          <p className="mb-1 block text-xs font-medium text-slate-700">Interviewer(s)</p>
          <p className="text-sm text-slate-600">
            {interview.interviewerIds.map((id) => getUserById(id)?.name ?? 'Unknown').join(', ')}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Interviewers can't be changed here. Cancel and schedule a new interview to change them.
          </p>
        </div>
      ) : (
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
      )}
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
      <Input
        label="Interview room"
        placeholder="e.g. HQ - Room 4B"
        maxLength={ROOM_MAX_LENGTH}
        value={room}
        onChange={(e) => setRoom(e.target.value)}
      />
      <Input label="Location / meeting link" value={location} onChange={(e) => setLocation(e.target.value)} />
      <Textarea label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {conflict && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p>{conflict}</p>
          <div>
            <Button type="button" size="sm" variant="secondary" disabled={isSubmitting} onClick={() => void submit(true)}>
              {interview ? 'Save anyway' : 'Schedule anyway'}
            </Button>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {interview ? 'Save changes' : 'Schedule interview'}
        </Button>
      </div>
    </form>
  );
}
