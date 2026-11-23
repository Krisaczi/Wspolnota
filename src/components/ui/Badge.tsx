import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  success: 'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-200',
  warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-200',
  error: 'bg-error-100 text-error-800 dark:bg-error-900/40 dark:text-error-200',
  info: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/40 dark:text-secondary-200',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
