import { useTranslation } from 'react-i18next';
import { MODULE_PAGES } from '../../app/modulePages';
import { useDashboardSync } from '../../app/dashboardSync';
import { ToastViewport } from '../ui/ToastViewport';
import { useUiStore } from '../../stores/uiStore';
import { Sidebar } from './Sidebar';

export function AppShell() {
  useTranslation();
  useDashboardSync();
  const activeModule = useUiStore((state) => state.activeModule);
  const ActivePage = MODULE_PAGES[activeModule];

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div key={activeModule} className="animate-slide-up mx-auto max-w-7xl">
          <ActivePage />
        </div>
      </main>
      <ToastViewport />
    </div>
  );
}
