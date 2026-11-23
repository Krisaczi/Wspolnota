import type { ReactNode } from 'react';

type StatTone = 'neutral' | 'success' | 'warning' | 'error';

const TONE_CLASSES: Record<StatTone, string> = {
  neutral: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
  success: 'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-200',
  warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-200',
  error: 'bg-error-100 text-error-800 dark:bg-error-900/40 dark:text-error-200',
};

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: StatTone;
  hint?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, icon, tone = 'neutral', hint, onClick }: StatCardProps) {
  const className = `group rounded-xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900${
    onClick ? ' w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500' : ''
  }`;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}
