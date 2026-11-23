import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/periods';
import { formatMoney } from '../../lib/money';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { EmptyState } from '../../components/ui/EmptyState';

export function RecentPayments() {
  const { t } = useTranslation();
  const payments = useDashboardStore((state) => state.recentPayments);
  const currency = useSettingsStore((state) => state.settings.currency);

  if (payments.length === 0) {
    return <EmptyState title={t('dashboard.recentPaymentsEmptyTitle')} description={t('dashboard.recentPaymentsEmptyDescription')} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {payments.map((payment) => (
          <li key={payment.id} className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {t('dashboard.paymentApartment', { number: payment.apartmentNumber })}
              </p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {formatDate(payment.paymentDate)}
                {payment.description ? ` - ${payment.description}` : ''}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-success-700 dark:text-success-400">
              {formatMoney(payment.amount, currency)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
