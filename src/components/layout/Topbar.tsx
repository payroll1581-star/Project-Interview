import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../context/useAuth';
import { Button } from '../ui/Button';
import { ChangePasswordForm } from './ChangePasswordForm';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/candidates': 'Candidates',
  '/scheduling': 'Scheduling',
  '/interviewers': 'Interviewers',
  '/evaluation-criteria': 'Evaluation Criteria',
  '/activity-log': 'Activity Log',
  '/my-interviews': 'My Interviews',
};

function resolveTitle(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith('/candidates/')) return 'Candidate Profile';
  return 'Interview Manager';
}

interface TopbarProps {
  onOpenMenu: () => void;
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, logoutEverywhere } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [isLoggingOutEverywhere, setIsLoggingOutEverywhere] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function handleLogoutEverywhere() {
    if (!window.confirm('Log out of all devices and browsers, including this one?')) return;
    setIsLoggingOutEverywhere(true);
    try {
      await logoutEverywhere();
      navigate('/login', { replace: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong.');
      setIsLoggingOutEverywhere(false);
    }
  }

  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-y-2 border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          className="-ml-1 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-slate-900">{resolveTitle(location.pathname)}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {currentUser && <span className="hidden text-sm text-slate-500 sm:inline">{currentUser.name}</span>}
        <Button variant="ghost" size="sm" onClick={() => setChangingPassword(true)}>
          Change password
        </Button>
        <Button variant="ghost" size="sm" disabled={isLoggingOutEverywhere} onClick={handleLogoutEverywhere}>
          Log out everywhere
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </div>
      <ChangePasswordForm open={changingPassword} onClose={() => setChangingPassword(false)} />
    </header>
  );
}
