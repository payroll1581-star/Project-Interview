import { useLocation } from 'react-router';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/candidates': 'Candidates',
  '/scheduling': 'Scheduling',
};

function resolveTitle(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith('/candidates/')) return 'Candidate Profile';
  return 'Interview Manager';
}

export function Topbar() {
  const location = useLocation();
  return (
    <header className="flex h-14 items-center border-b border-slate-200 bg-white px-6">
      <h1 className="text-base font-semibold text-slate-900">{resolveTitle(location.pathname)}</h1>
    </header>
  );
}
