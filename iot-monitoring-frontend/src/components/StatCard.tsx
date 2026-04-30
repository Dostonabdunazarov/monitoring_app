import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
}

export default function StatCard({ label, value, icon, color = 'text-violet-400' }: StatCardProps) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 flex items-center gap-4">
      <div className={cn('shrink-0', color)}>{icon}</div>
      <div>
        <p className="text-2xl font-semibold text-white">{value}</p>
        <p className="text-sm text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
