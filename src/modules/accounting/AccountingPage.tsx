import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, FileText, ListTree, NotebookPen } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ChartOfAccountsPage } from './chart/ChartOfAccountsPage';
import { JournalEntriesPage } from './journal/JournalEntriesPage';
import { GeneralLedgerPage } from './ledger/GeneralLedgerPage';
import { AccountingReportsPage } from './reports/AccountingReportsPage';

type AccountingTab = 'chart' | 'journal' | 'ledger' | 'reports';

const TABS: { id: AccountingTab; icon: typeof ListTree; component: ComponentType }[] = [
  { id: 'chart', icon: ListTree, component: ChartOfAccountsPage },
  { id: 'journal', icon: NotebookPen, component: JournalEntriesPage },
  { id: 'ledger', icon: BookOpen, component: GeneralLedgerPage },
  { id: 'reports', icon: FileText, component: AccountingReportsPage },
];

export function AccountingPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AccountingTab>('chart');
  const active = TABS.find((item) => item.id === tab) ?? TABS[0];
  const ActiveTab = active.component;

  return (
    <>
      <PageHeader title={t('accounting.title')} description={t('accounting.description')} />

      <div
        role="tablist"
        aria-label={t('accounting.sectionsLabel')}
        className="mb-6 flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800"
      >
        {TABS.map((item) => {
          const selected = item.id === tab;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                selected
                  ? 'border-primary-700 text-primary-800 dark:border-primary-400 dark:text-primary-200'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
              }`}
            >
              <Icon size={16} />
              {t(`accounting.tabs.${item.id}`)}
            </button>
          );
        })}
      </div>

      <ActiveTab />
    </>
  );
}
