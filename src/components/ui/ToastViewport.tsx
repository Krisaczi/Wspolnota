import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToastStore, type ToastTone } from '../../stores/toastStore';

const TONE_STYLES: Record<ToastTone, { icon: typeof CheckCircle2; classes: string }> = {
  success: {
    icon: CheckCircle2,
    classes: 'border-success-500 text-success-800 dark:text-success-200',
  },
  error: {
    icon: XCircle,
    classes: 'border-error-500 text-error-800 dark:text-error-200',
  },
  info: {
    icon: Info,
    classes: 'border-secondary-500 text-secondary-800 dark:text-secondary-200',
  },
};

export function ToastViewport() {
  const { t } = useTranslation();
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3" aria-live="polite">
      {toasts.map((toast) => {
        const style = TONE_STYLES[toast.tone];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={`animate-slide-up pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 bg-white p-4 shadow-lg dark:bg-neutral-900 ${style.classes}`}
          >
            <Icon size={20} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-sm leading-relaxed text-neutral-800 dark:text-neutral-100">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={t('notifications.dismiss')}
              className="rounded p-0.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-100"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
