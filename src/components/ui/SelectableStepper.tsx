import clsx from 'clsx';
import { solidColorClasses, type BadgeColor } from './badgeStyles';

export interface SelectableStep {
  key: string;
  label: string;
  detail: string;
  tone: BadgeColor;
}

interface SelectableStepperProps {
  steps: SelectableStep[];
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
  ariaLabel: string;
}

export function SelectableStepper({ steps, selectedKey, onSelect, ariaLabel }: SelectableStepperProps) {
  return (
    <div className="overflow-x-auto">
      <ol aria-label={ariaLabel} className="flex flex-row gap-x-2">
        {steps.map((step, index) => {
          const selected = step.key === selectedKey;
          return (
            <li key={step.key} className="group min-w-24 shrink basis-0 flex-1">
              <button
                type="button"
                aria-pressed={selected}
                aria-current={selected ? 'step' : undefined}
                onClick={() => onSelect(step.key)}
                className="block w-full rounded-md py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <span className="flex min-h-8 w-full items-center">
                  <span
                    className={clsx(
                      'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white',
                      solidColorClasses[step.tone],
                      selected && 'ring-4 ring-indigo-200',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="ms-2 h-px flex-1 bg-slate-200 group-last:hidden" />
                </span>
                <span
                  className={clsx(
                    'mt-2 block truncate text-sm',
                    selected ? 'font-semibold text-slate-900' : 'font-medium text-slate-600',
                  )}
                >
                  {step.label}
                </span>
                <span className="block truncate text-xs text-slate-500">{step.detail}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
