import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

const SCROLL_EDGE_TOLERANCE_PX = 4;

// A history of interview rounds isn't a linear progress indicator (rounds aren't "completed" in
// sequence, and any one can be selected), so this reads as a horizontally scrolling tab strip --
// fixed-width cards in chronological order -- rather than a stretched or wrapping progress bar.
// Selection state (ring/shadow) and outcome (circle color) are kept as two separate visual
// languages so they never fight for the same color.
export function SelectableStepper({ steps, selectedKey, onSelect, ariaLabel }: SelectableStepperProps) {
  const scrollerRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const node = scrollerRef.current;
    if (!node) return;
    setCanScrollLeft(node.scrollLeft > SCROLL_EDGE_TOLERANCE_PX);
    setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - SCROLL_EDGE_TOLERANCE_PX);
  }

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  useEffect(() => {
    if (!selectedKey) return;
    itemRefs.current.get(selectedKey)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedKey]);

  function scrollByCards(direction: 1 | -1) {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll to earlier rounds"
          onClick={() => scrollByCards(-1)}
          className="absolute inset-y-0 left-0 z-10 flex w-8 items-center justify-center bg-gradient-to-r from-white via-white/90 to-transparent text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      <ol
        ref={scrollerRef}
        onScroll={updateScrollState}
        aria-label={ariaLabel}
        className="flex flex-row gap-x-3 overflow-x-auto scroll-smooth py-1"
      >
        {steps.map((step, index) => {
          const selected = step.key === selectedKey;
          return (
            <li
              key={step.key}
              ref={(el) => {
                if (el) itemRefs.current.set(step.key, el);
                else itemRefs.current.delete(step.key);
              }}
              className="w-28 shrink-0 snap-start"
            >
              <button
                type="button"
                aria-pressed={selected}
                aria-current={selected ? 'step' : undefined}
                onClick={() => onSelect(step.key)}
                className={clsx(
                  'block w-full rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                  selected
                    ? 'border-indigo-200 bg-white shadow-sm ring-2 ring-indigo-500 ring-offset-1'
                    : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50',
                )}
              >
                <span
                  className={clsx(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
                    solidColorClasses[step.tone],
                  )}
                >
                  {index + 1}
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
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll to later rounds"
          onClick={() => scrollByCards(1)}
          className="absolute inset-y-0 right-0 z-10 flex w-8 items-center justify-center bg-gradient-to-l from-white via-white/90 to-transparent text-slate-500 hover:text-slate-700"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
