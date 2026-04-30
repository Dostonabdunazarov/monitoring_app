import { cn } from '../utils/cn';

type Status = 'online' | 'offline' | 'error';

const styles: Record<Status, string> = {
  online: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25',
  offline: 'bg-gray-500/15 text-gray-400 ring-gray-500/25',
  error: 'bg-red-500/15 text-red-400 ring-red-500/25',
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset',
        styles[status]
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
