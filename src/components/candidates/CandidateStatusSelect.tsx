import { Select } from '../ui/Input';
import { candidateStatusOptions } from '../../lib/status';
import { useAppData } from '../../context/useAppData';
import type { CandidateStatus } from '../../types';

export function CandidateStatusSelect({ candidateId, status }: { candidateId: string; status: CandidateStatus }) {
  const { updateCandidateStatus } = useAppData();
  return (
    <Select
      label="Status"
      value={status}
      onChange={(e) =>
        updateCandidateStatus(candidateId, e.target.value as CandidateStatus).catch((err: Error) =>
          alert(err.message),
        )
      }
    >
      {candidateStatusOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}
