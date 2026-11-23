import type { ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 px-6 py-12 text-center dark:border-neutral-700">
      <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
