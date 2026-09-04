import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-slate-400">
      <Icon size={28} strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
