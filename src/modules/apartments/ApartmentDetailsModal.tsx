import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import { BalanceText } from '../../components/ui/BalanceText';
import { LateInterestSection } from './LateInterestSection';
import { listChargesInRange } from '../../db/repositories/monthlyChargesRepo';
import { listPayments } from '../../db/repositories/paymentsRepo';
import { meterAmountLinesByApartment } from '../../db/repositories/metersRepo';
import { meterTypeDisplayName } from '../../lib/meterLabels';
import { roundMoney, formatMoney } from '../../lib/money';
import { formatPeriod } from '../../lib/periods';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ApartmentView } from '../../domain/types';

interface ApartmentDetailsModalProps {
  apartment: ApartmentView;
  onClose: () => void;
}

export function ApartmentDetailsModal({ apartment, onClose }: ApartmentDetailsModalProps) {
  const { t } = useTranslation();
  const currency = useSettingsStore((state) => state.settings.currency);

  const { chargeRows, paymentRows, totals, meterLines } = useMemo(() => {
    const year = String(new Date().getFullYear());
    const charges = listChargesInRange(`${year}-01`, `${year}-12`, apartment.id);
    const payments = listPayments({ apartmentId: apartment.id, fromMonth: `${year}-01`, toMonth: `${year}-12` });
    const byMonth = new Map<string, number>();
    for (const charge of charges) {
      byMonth.set(charge.billingPeriod, roundMoney((byMonth.get(charge.billingPeriod) ?? 0) + charge.amount));
    }
    const chargeRows = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
    const paymentRows = [...payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
    return {
      chargeRows,
      paymentRows,
      meterLines: meterAmountLinesByApartment().get(apartment.id) ?? [],
      totals: {
        charges: roundMoney(chargeRows.reduce((sum, [, amount]) => sum + amount, 0)),
        payments: roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0)),
      },
    };
  }, [apartment.id]);

  const yearBalance = roundMoney(totals.charges - totals.payments);

  return (
    <Modal
      title={t('apartments.details.title', { number: apartment.apartmentNumber })}
      description={t('apartments.details.yearDescription', { year: String(new Date().getFullYear()) })}
      size="lg"
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('apartments.details.charges')}</h3>
          {chargeRows.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('apartments.details.noCharges')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="py-2 font-medium">{t('apartments.details.month')}</th>
                  <th className="py-2 text-right font-medium">{t('fields.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {chargeRows.map(([period, amount]) => (
                  <tr key={period} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                    <td className="py-2 text-neutral-700 dark:text-neutral-300">{formatPeriod(period)}</td>
                    <td className="py-2 text-right text-neutral-900 dark:text-neutral-100">{formatMoney(amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-200 font-semibold dark:border-neutral-800">
                  <td className="py-2">{t('apartments.details.totalCharged')}</td>
                  <td className="py-2 text-right text-neutral-900 dark:text-neutral-100">{formatMoney(totals.charges, currency)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('apartments.details.payments')}</h3>
          {paymentRows.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('apartments.details.noPayments')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="py-2 font-medium">{t('payments.form.date')}</th>
                  <th className="py-2 font-medium">{t('apartments.details.description')}</th>
                  <th className="py-2 text-right font-medium">{t('fields.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.map((payment) => (
                  <tr key={payment.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                    <td className="py-2 text-neutral-700 dark:text-neutral-300">{payment.paymentDate}</td>
                    <td className="py-2 text-neutral-700 dark:text-neutral-300">{payment.description ?? '—'}</td>
                    <td className="py-2 text-right text-neutral-900 dark:text-neutral-100">{formatMoney(payment.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-200 font-semibold dark:border-neutral-800">
                  <td className="py-2" colSpan={2}>{t('apartments.details.totalPaid')}</td>
                  <td className="py-2 text-right text-neutral-900 dark:text-neutral-100">{formatMoney(totals.payments, currency)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('apartments.details.summary')}</h3>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">{t('apartments.details.totalCharged')}</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">{formatMoney(totals.charges, currency)}</dd>
            </div>
            {meterLines.map((line) => (
              <div key={line.meterTypeId} className="flex justify-between gap-4 pl-3">
                <dt className="text-neutral-500 dark:text-neutral-400">{meterTypeDisplayName(line.meterTypeName)}</dt>
                <dd className="font-medium text-neutral-900 dark:text-neutral-100">{formatMoney(line.amount, currency)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">{t('apartments.details.totalPaid')}</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">{formatMoney(totals.payments, currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">{t('apartments.form.startingBalance')}</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">{formatMoney(apartment.startingBalance, currency)}</dd>
            </div>
            <div className="mt-1 flex items-center justify-between gap-4 border-t border-neutral-200 pt-2 dark:border-neutral-700">
              <dt className="font-semibold text-neutral-900 dark:text-neutral-100">{t('fields.balance')}</dt>
              <dd><BalanceText balance={apartment.balance} currency={currency} /></dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {t('apartments.details.yearBalanceNote', { amount: formatMoney(yearBalance, currency) })}
          </p>
        </section>
        <LateInterestSection
          apartmentId={apartment.id}
          apartmentNumber={apartment.apartmentNumber}
          balance={apartment.balance}
          currency={currency}
        />
      </div>
    </Modal>
  );
}
