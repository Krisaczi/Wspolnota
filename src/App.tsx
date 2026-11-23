import { useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppShell } from './components/layout/AppShell';
import { flushPendingSave } from './db/client';
import { useAppStore } from './stores/appStore';

export default function App() {
  const { t } = useTranslation();
  const status = useAppStore((state) => state.status);
  const errorMessage = useAppStore((state) => state.errorMessage);
  const initialize = useAppStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
    const saveOnExit = () => void flushPendingSave();
    window.addEventListener('pagehide', saveOnExit);
    window.addEventListener('beforeunload', saveOnExit);
    return () => {
      window.removeEventListener('pagehide', saveOnExit);
      window.removeEventListener('beforeunload', saveOnExit);
    };
  }, [initialize]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-neutral-600 dark:text-neutral-400">
        <Loader2 size={28} className="animate-spin text-primary-700" />
        <p className="text-sm">{t('app.loading')}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-error-500 bg-white p-6 text-center shadow-sm dark:bg-neutral-900">
          <AlertTriangle size={32} className="mx-auto text-error-700" />
          <h1 className="mt-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('app.databaseErrorTitle')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void initialize()}
            className="mt-5 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
          >
            {t('app.retry')}
          </button>
        </div>
      </div>
    );
  }

  return <AppShell />;
}
