import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Banknote, Building2, Coins, Landmark, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatMoney } from '../../lib/money';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { RecentPayments } from './RecentPayments';
import { DebtorsModal } from './DebtorsModal';

export function DashboardPage() {
  const { t } = useTranslation();
  const setActiveModule = useUiStore((state) => state.setActiveModule);
  const [showDebtors, setShowDebtors] = useState(false);
  const summary = useDashboardStore((state) => state.summary);
  const accounting = useDashboardStore((state) => state.accounting);
  const refresh = useDashboardStore((state) => state.refresh);
  const currency = useSettingsStore((state) => state.settings.currency);
  const money = (value: number) => formatMoney(value, currency);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />

      {summary.apartmentCount === 0 ? (
        <EmptyState title={t('dashboard.welcomeTitle')} description={t('dashboard.welcomeDescription')} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={t('dashboard.stats.apartments')} value={String(summary.apartmentCount)} icon={<Building2 size={18} />} onClick={() => setActiveModule('apartments')} />
        <StatCard
          label={t('dashboard.stats.receivables')}
          value={money(summary.receivables)}
          icon={<Coins size={18} />}
          tone="error"
          hint={t('dashboard.stats.receivablesHint')}
          onClick={() => setActiveModule('apartments')}
        />
        <StatCard
          label={t('dashboard.stats.liabilities')}
          value={money(summary.liabilities)}
          icon={<Scale size={18} />}
          tone="success"
          hint={t('dashboard.stats.liabilitiesHint')}
          onClick={() => setActiveModule('apartments')}
        />
        <StatCard
          label={t('dashboard.stats.totalBalance')}
          value={money(summary.totalBalance)}
          icon={<Wallet size={18} />}
          hint={t('dashboard.stats.totalBalanceHint')}
          onClick={() => setActiveModule('apartments')}
        />
        <StatCard
          label={t('dashboard.stats.debtorCount')}
          value={String(summary.debtorCount)}
          icon={<AlertCircle size={18} />}
          tone="warning"
          onClick={() => setShowDebtors(true)}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">{t('dashboard.accountingThisMonth')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label={t('dashboard.accounting.bankBalance')} value={money(accounting.bankBalance)} icon={<Landmark size={18} />} onClick={() => setActiveModule('accounting')} />
          <StatCard label={t('dashboard.accounting.cashOnHand')} value={money(accounting.cashBalance)} icon={<Banknote size={18} />} onClick={() => setActiveModule('accounting')} />
          <StatCard
            label={t('dashboard.accounting.incomeThisMonth')}
            value={money(accounting.monthlyIncome)}
            icon={<TrendingUp size={18} />}
            tone="success"
            onClick={() => setActiveModule('accounting')}
          />
          <StatCard
            label={t('dashboard.accounting.expensesThisMonth')}
            value={money(accounting.monthlyExpenses)}
            icon={<TrendingDown size={18} />}
            tone="warning"
            onClick={() => setActiveModule('accounting')}
          />
          <StatCard
            label={t('dashboard.accounting.netResult')}
            value={money(accounting.netResult)}
            icon={<Scale size={18} />}
            tone={accounting.netResult >= 0 ? 'success' : 'error'}
            hint={t('dashboard.accounting.netResultHint')}
            onClick={() => setActiveModule('accounting')}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">{t('dashboard.recentPayments')}</h2>
        <RecentPayments />
      </section>

      {showDebtors ? <DebtorsModal onClose={() => setShowDebtors(false)} /> : null}
    </>
  );
}
