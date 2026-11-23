import { useTranslation } from 'react-i18next';
import { Badge } from './Badge';
import { formatMoney } from '../../lib/money';
import { isDebt } from '../../domain/balances';

export function BalanceText({ balance, currency }: { balance: number; currency: string }) {
  const { t } = useTranslation();
  if (isDebt(balance)) {
    return (
      <span className="font-semibold text-error-700 dark:text-error-400">{formatMoney(balance, currency)}</span>
    );
  }
  if (balance < -0.005) {
    return (
      <span className="font-semibold text-success-700 dark:text-success-400">
        {t('balance.creditAmount', { amount: formatMoney(-balance, currency) })}
      </span>
    );
  }
  return <span className="text-neutral-600 dark:text-neutral-400">{formatMoney(0, currency)}</span>;
}

export function BalanceStatusBadge({ balance }: { balance: number }) {
  const { t } = useTranslation();
  if (isDebt(balance)) return <Badge tone="error">{t('balance.status.debt')}</Badge>;
  if (balance < -0.005) return <Badge tone="success">{t('balance.status.credit')}</Badge>;
  return <Badge tone="neutral">{t('balance.status.settled')}</Badge>;
}
