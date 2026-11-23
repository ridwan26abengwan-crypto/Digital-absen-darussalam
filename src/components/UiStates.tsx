import React from 'react';
import type { LucideIcon } from 'lucide-react';

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div className="surface-card overflow-hidden">
      <div className="h-11 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 px-4 flex items-center gap-4">
        {Array.from({ length: cols }).map((__, c) => (
          <div
            key={c}
            className="h-3 rounded-md bg-slate-200/80 dark:bg-slate-700/70 flex-1 animate-pulse"
          />
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-4 animate-pulse">
            {Array.from({ length: cols }).map((__, c) => (
              <div
                key={c}
                className="h-3.5 rounded-md bg-slate-200/70 dark:bg-slate-800 flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="surface-card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="mt-4 font-display text-base font-bold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn-primary mt-6">
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const StatusLabel: React.FC<{
  status: string;
  variant: 'emerald' | 'amber' | 'sky' | 'rose' | 'slate';
}> = ({ status, variant }) => {
  const styles: Record<typeof variant, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/50',
    amber: 'text-amber-700 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/50',
    sky: 'text-sky-700 dark:text-sky-400 bg-sky-50/90 dark:bg-sky-950/50',
    rose: 'text-rose-700 dark:text-rose-400 bg-rose-50/90 dark:bg-rose-950/50',
    slate: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md font-semibold text-xs tracking-wide whitespace-nowrap ${styles[variant]}`}
    >
      {status}
    </span>
  );
};
