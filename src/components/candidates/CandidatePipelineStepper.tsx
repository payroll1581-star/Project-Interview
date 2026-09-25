import { Stepper } from '../ui/Stepper';
import { CandidateStatusPill } from '../ui/StatusPill';
import { candidatePipelineSteps } from '../../lib/status';
import type { CandidateStatus } from '../../types';

const steps = candidatePipelineSteps.map((label) => ({ label }));

export function CandidatePipelineStepper({ status }: { status: CandidateStatus }) {
  const currentIndex = candidatePipelineSteps.indexOf(status);

  return (
    <div className="flex flex-col gap-3">
      <Stepper steps={steps} currentIndex={currentIndex} />
      {status === 'Rejected' && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CandidateStatusPill status={status} />
          <span>This candidate is no longer in the hiring pipeline.</span>
        </div>
      )}
    </div>
  );
}
