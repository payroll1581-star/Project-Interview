import { useState } from 'react';
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

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-base font-semibold text-slate-900">{resolveTitle(location.pathname)}</h1>
      <div className="flex items-center gap-3">
        {currentUser && <span className="text-sm text-slate-500">{currentUser.name}</span>}
        <Button variant="ghost" size="sm" onClick={() => setChangingPassword(true)}>
          Change password
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </div>
      <ChangePasswordForm open={changingPassword} onClose={() => setChangingPassword(false)} />
    </header>
  );
}
