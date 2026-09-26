import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  expandable?: boolean;
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The dialog lives in its own component so state such as "expanded" is dropped every time the
// modal closes -- Modal itself stays mounted, and would otherwise reopen still expanded.
export function Modal({ open, ...props }: ModalProps) {
  return open ? <OpenModal {...props} /> : null;
}

function OpenModal({ onClose, title, children, size = 'lg', expandable = false }: Omit<ModalProps, 'open'>) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []).filter(
        (el) => el.offsetParent !== null,
      );
    (focusables()[0] ?? node)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(
          'relative flex w-full flex-col rounded-xl bg-white shadow-xl',
          expanded ? 'h-full max-w-none' : ['max-h-[90vh]', sizeClasses[size]],
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id={titleId} className="text-sm font-semibold text-slate-900">
            {title}
          </h2>
          <div className="flex items-center gap-1">
            {expandable && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={expanded ? 'Restore size' : 'Expand'}
                title={expanded ? 'Restore size' : 'Expand'}
              >
                {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className={clsx('overflow-y-auto px-5 py-4', expanded && 'min-h-0 flex-1')}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
