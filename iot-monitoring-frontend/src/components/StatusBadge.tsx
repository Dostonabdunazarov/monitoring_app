import { cn } from '../utils/cn';

type Status = 'Active' | 'Inactive' | 'Offline';

const styles: Record<Status, string> = {
  Active: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25',
  Inactive: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/25',
  Offline: 'bg-gray-500/15 text-gray-400 ring-gray-500/25',
};

const labels: Record<Status, string> = {
  Active: 'Active',
  Inactive: 'Inactive',
  Offline: 'Offline',
};

export default function StatusBadge({ status }: { status: Status }) {
  const style = styles[status] ?? styles.Offline;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset',
        style
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[status] ?? status}
    </span>
  );
}
