import type { ReactNode } from 'react';

interface IconButtonProps {
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  children: ReactNode;
}

const TONE_CLASSES = {
  default: 'text-neutral-600 hover:bg-neutral-100 hover:text-primary-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-primary-300',
  danger: 'text-neutral-600 hover:bg-error-100 hover:text-error-800 dark:text-neutral-400 dark:hover:bg-error-900/40 dark:hover:text-error-300',
};

export function IconButton({ label, onClick, tone = 'default', disabled = false, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${TONE_CLASSES[tone]}`}
    >
      {children}
    </button>
  );
}
