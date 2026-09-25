import { Check } from 'lucide-react';

export interface StepperStep {
  label: string;
}

export function Stepper({ steps, currentIndex }: { steps: StepperStep[]; currentIndex: number }) {
  return (
    <ol aria-label="Progress" className="relative flex flex-row gap-x-2">
      {steps.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;

        const circleClasses = isComplete
          ? 'bg-blue-600 text-white'
          : isCurrent
            ? 'bg-blue-600 text-white ring-4 ring-blue-100'
            : 'bg-slate-100 text-slate-800';

        return (
          <li
            key={step.label}
            aria-current={isCurrent ? 'step' : undefined}
            className="group flex-1 shrink basis-0"
          >
            <div className="inline-flex min-h-7 w-full min-w-7 items-center align-middle text-xs">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full font-medium ${circleClasses}`}
              >
                {isComplete ? <Check size={14} aria-hidden="true" /> : i + 1}
              </span>
              <div
                className={`ms-2 h-px w-full flex-1 group-last:hidden ${isComplete ? 'bg-blue-600' : 'bg-slate-200'}`}
              />
            </div>
            <div className="mt-3">
              <span
                className={`block text-xs sm:text-sm ${isCurrent ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}`}
              >
                {step.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
