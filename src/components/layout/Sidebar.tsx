import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NAVIGATION_ITEMS } from '../../app/navigation';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';

export function Sidebar() {
  const { t } = useTranslation();
  const activeModule = useUiStore((state) => state.activeModule);
  const setActiveModule = useUiStore((state) => state.setActiveModule);
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const communityName = useSettingsStore((state) => state.settings.communityName);

  return (
    <aside className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-4 lg:flex-col lg:items-stretch lg:gap-6 lg:px-5 lg:py-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">{t('app.tagline')}</p>
          <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200" title={communityName}>
            {communityName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 lg:hidden"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <nav aria-label={t('nav.mainNavigation')} className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = item.id === activeModule;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveModule(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/50 dark:text-primary-100'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-500'} />
              {t(`nav.${item.id}`)}
            </button>
          );
        })}
      </nav>

      <div className="hidden px-5 pb-6 pt-8 lg:mt-auto lg:block lg:pt-6">
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex w-full items-center justify-between rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          {theme === 'dark' ? t('theme.darkMode') : t('theme.lightMode')}
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </aside>
  );
}
