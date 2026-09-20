import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Briefcase,
  UserRound,
  ClipboardList,
  ListChecks,
  History,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/useAuth';

const adminNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/candidates', label: 'Candidates', icon: Users },
  { to: '/scheduling', label: 'Scheduling', icon: CalendarClock },
  { to: '/interviewers', label: 'Interviewers', icon: UserRound },
  { to: '/evaluation-criteria', label: 'Evaluation Criteria', icon: ListChecks },
  { to: '/activity-log', label: 'Activity Log', icon: History },
];

const interviewerNavItems = [{ to: '/my-interviews', label: 'My Interviews', icon: ClipboardList }];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { currentUser } = useAuth();
  const navItems = currentUser?.role === 'interviewer' ? interviewerNavItems : adminNavItems;

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = drawerRef.current;
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []).filter(
        (el) => el.offsetParent !== null,
      );
    (focusables()[0] ?? node)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
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
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <Briefcase className="text-indigo-600" size={22} />
          <span className="text-sm font-semibold text-slate-900">Interview Manager</span>
        </div>
        <NavLinks />
      </aside>

      {mobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onCloseMobile} />
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              tabIndex={-1}
              className="relative flex w-64 flex-col bg-white shadow-xl"
            >
              <div className="flex items-center justify-between px-5 py-5">
                <div className="flex items-center gap-2">
                  <Briefcase className="text-indigo-600" size={22} />
                  <span className="text-sm font-semibold text-slate-900">Interview Manager</span>
                </div>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <NavLinks onNavigate={onCloseMobile} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
