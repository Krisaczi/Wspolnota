import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const CONTROL_CLASS =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:disabled:bg-neutral-800';

function controlClass(error?: string): string {
  return `${CONTROL_CLASS} ${
    error
      ? 'border-error-500 focus:border-error-500'
      : 'border-neutral-300 focus:border-primary-500 dark:border-neutral-700'
  }`;
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}

export function Field({ label, error, hint, htmlFor, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-error-700 dark:text-error-500">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ error, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input className={`${controlClass(error)} ${className}`} aria-invalid={Boolean(error)} {...rest} />;
}

export function SelectInput({
  error,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <select className={`${controlClass(error)} ${className}`} aria-invalid={Boolean(error)} {...rest}>
      {children}
    </select>
  );
}

export function TextAreaInput({
  error,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return (
    <textarea
      className={`${controlClass(error)} min-h-[80px] resize-y ${className}`}
      aria-invalid={Boolean(error)}
      {...rest}
    />
  );
}

export function Checkbox({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-neutral-300 text-primary-700 focus:ring-primary-500"
      />
      {label}
    </label>
  );
}
