import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { BalanceText } from '../../components/ui/BalanceText';
import { formatMoney } from '../../lib/money';
import { roundMoney } from '../../lib/money';
import { useApartmentsStore } from '../../stores/apartmentsStore';
import { useSettingsStore } from '../../stores/settingsStore';

const DEBT_EPSILON = 0.005;

export function DebtorsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const apartments = useApartmentsStore((state) => state.items);
  const refreshApartments = useApartmentsStore((state) => state.refresh);
  const currency = useSettingsStore((state) => state.settings.currency);

  useEffect(() => {
    refreshApartments();
  }, [refreshApartments]);

  const debtors = apartments
    .filter((apartment) => apartment.balance > DEBT_EPSILON)
    .sort((a, b) => b.balance - a.balance);
  const totalDebt = roundMoney(debtors.reduce((sum, apartment) => sum + apartment.balance, 0));

  return (
    <Modal
      title={t('dashboard.debtors.title')}
      description={t('dashboard.debtors.description', { count: String(debtors.length) })}
      size="lg"
      onClose={onClose}
    >
      {debtors.length === 0 ? (
        <EmptyState title={t('dashboard.debtors.none')} description="" />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <th className="py-2 font-medium">{t('apartments.title')}</th>
              <th className="py-2 font-medium">{t('fields.owner')}</th>
              <th className="py-2 text-right font-medium">{t('fields.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {debtors.map((apartment) => (
              <tr key={apartment.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                <td className="py-2 font-medium text-neutral-900 dark:text-neutral-100">
                  {t('dashboard.paymentApartment', { number: apartment.apartmentNumber })}
                </td>
                <td className="py-2 text-neutral-700 dark:text-neutral-300">
                  {apartment.ownerName ?? <span className="text-neutral-400">{t('apartments.noOwner')}</span>}
                </td>
                <td className="py-2 text-right">
                  <BalanceText balance={apartment.balance} currency={currency} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 font-semibold dark:border-neutral-800">
              <td className="py-2" colSpan={2}>{t('dashboard.debtors.total')}</td>
              <td className="py-2 text-right text-neutral-900 dark:text-neutral-100">{formatMoney(totalDebt, currency)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </Modal>
  );
}
