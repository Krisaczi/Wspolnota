import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Receipt, Trash2, WandSparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { StatCard } from '../../components/ui/StatCard';
import { TextInput } from '../../components/ui/FormFields';
import { attempt } from '../../lib/attempt';
import { formatMoney, roundMoney } from '../../lib/money';
import { currentPeriod, formatPeriod, isValidPeriod, shiftPeriod } from '../../lib/periods';
import type { ChargeView } from '../../domain/types';
import { useApartmentsStore } from '../../stores/apartmentsStore';
import { useBillingStore } from '../../stores/billingStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { toast } from '../../stores/toastStore';

export function MonthlyBillingPage() {
  const { t } = useTranslation();
  const period = useBillingStore((state) => state.period);
  const charges = useBillingStore((state) => state.charges);
  const setPeriod = useBillingStore((state) => state.setPeriod);
  const refresh = useBillingStore((state) => state.refresh);
  const generate = useBillingStore((state) => state.generate);
  const removeBilling = useBillingStore((state) => state.removeBilling);
  const currency = useSettingsStore((state) => state.settings.currency);
  const apartments = useApartmentsStore((state) => state.items);
  const refreshApartments = useApartmentsStore((state) => state.refresh);

  const [query, setQuery] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [detailApartmentId, setDetailApartmentId] = useState<number | null>(null);

  useEffect(() => {
    refresh();
    refreshApartments();
  }, [refresh, refreshApartments]);

  const money = (value: number) => formatMoney(value, currency);

  const groups = useMemo(() => {
    const ownerByApartment = new Map(apartments.map((apartment) => [apartment.id, apartment.ownerName]));
    const byApartment = new Map<number, { apartmentId: number; apartmentNumber: string; ownerName: string | null; charges: ChargeView[]; total: number }>();
    for (const charge of charges) {
      const existing = byApartment.get(charge.apartmentId);
      if (existing) {
        existing.charges.push(charge);
        existing.total += charge.amount;
      } else {
        byApartment.set(charge.apartmentId, {
          apartmentId: charge.apartmentId,
          apartmentNumber: charge.apartmentNumber,
          ownerName: ownerByApartment.get(charge.apartmentId) ?? null,
          charges: [charge],
          total: charge.amount,
        });
      }
    }
    return [...byApartment.values()].sort((a, b) => a.apartmentNumber.localeCompare(b.apartmentNumber, undefined, { numeric: true }));
  }, [charges, apartments]);

  const totalAmount = roundMoney(charges.reduce((sum, charge) => sum + charge.amount, 0));
  const billedApartments = groups.length;
  const detailGroup = detailApartmentId === null ? null : groups.find((group) => group.apartmentId === detailApartmentId) ?? null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter(
      (group) =>
        group.apartmentNumber.toLowerCase().includes(term) ||
        (group.ownerName !== null && group.ownerName.toLowerCase().includes(term)) ||
        group.charges.some((charge) => charge.chargeTypeName.toLowerCase().includes(term)),
    );
  }, [groups, query]);

  const handleGenerate = () => {
    const outcome = attempt(generate);
    if (!outcome.ok) return;
    const { created, alreadyBilled } = outcome.value;
    if (created === 0) {
      toast.info(t('billing.alreadyBilled', { period: formatPeriod(period) }));
      return;
    }
    const detail = alreadyBilled > 0 ? ` ${t('billing.existingUnchanged', { count: alreadyBilled })}` : '';
    toast.success(`${t('billing.created', { count: created, period: formatPeriod(period) })}${detail}`);
  };

  return (
    <>
      <PageHeader title={t('billing.title')} description={t('billing.description')} />

      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('billing.month')}</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" aria-label={t('billing.previousMonth')} onClick={() => setPeriod(shiftPeriod(period, -1))}>
              <ChevronLeft size={16} />
            </Button>
            <TextInput
              type="month"
              aria-label={t('billing.month')}
              className="w-44"
              value={period}
              onChange={(event) => {
                if (isValidPeriod(event.target.value)) setPeriod(event.target.value);
              }}
            />
            <Button variant="secondary" size="sm" aria-label={t('billing.nextMonth')} onClick={() => setPeriod(shiftPeriod(period, 1))}>
              <ChevronRight size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPeriod(currentPeriod())}>
              {t('billing.thisMonth')}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Trash2 size={16} />} onClick={() => setConfirmRemove(true)} disabled={charges.length === 0}>
            {t('billing.removeThisMonth')}
          </Button>
          <Button icon={<WandSparkles size={16} />} onClick={handleGenerate}>
            {t('billing.generate')}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('billing.stats.billedApartments')} value={String(billedApartments)} icon={<Receipt size={18} />} />
        <StatCard label={t('billing.stats.chargeEntries')} value={String(charges.length)} icon={<Receipt size={18} />} />
        <StatCard label={t('billing.stats.totalBilled')} value={money(totalAmount)} icon={<Receipt size={18} />} tone="success" />
      </div>

      <div className="mb-4">
        <SearchInput label={t('billing.searchLabel')} placeholder={t('billing.searchPlaceholder')} value={query} onChange={setQuery} />
      </div>

      {charges.length === 0 ? (
        <EmptyState
          title={t('billing.emptyTitle', { period: formatPeriod(period) })}
          description={t('billing.emptyDescription')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title={t('billing.noMatches')} description="" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((group) => (
            <button
              key={group.apartmentId}
              type="button"
              onClick={() => setDetailApartmentId(group.apartmentId)}
              className="group flex flex-col items-start gap-2 rounded-xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:border-primary-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-primary-500"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                <Receipt size={20} />
              </span>
              <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {t('dashboard.paymentApartment', { number: group.apartmentNumber })}
              </span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {group.ownerName ?? t('settlements.noOwner')}
              </span>
              <div className="mt-1 w-full border-t border-neutral-200 pt-2 dark:border-neutral-800">
                <p className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>{t('billing.stats.totalBilled')}</span>
                  <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {money(roundMoney(group.total))}
                  </span>
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {detailGroup !== null ? (
        <Modal
          title={t('billing.detailTitle', { number: detailGroup.apartmentNumber })}
          description={t('billing.detailPeriod', { period: formatPeriod(period) })}
          onClose={() => setDetailApartmentId(null)}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <th className="py-2 font-medium">{t('charges.columns.charge')}</th>
                <th className="py-2 text-right font-medium">{t('fields.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {detailGroup.charges.map((charge) => (
                <tr key={charge.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 text-neutral-900 dark:text-neutral-100">{charge.chargeTypeName}</td>
                  <td className="py-2 text-right font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                    {money(charge.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="py-2 font-medium text-neutral-600 dark:text-neutral-400">{t('billing.stats.totalBilled')}</td>
                <td className="py-2 text-right font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {money(roundMoney(detailGroup.total))}
                </td>
              </tr>
            </tfoot>
          </table>
        </Modal>
      ) : null}

      {confirmRemove ? (
        <ConfirmDialog
          title={t('billing.removeTitle', { period: formatPeriod(period) })}
          message={t('billing.removeMessage')}
          confirmLabel={t('billing.removeConfirm')}
          onCancel={() => setConfirmRemove(false)}
          onConfirm={() => {
            setConfirmRemove(false);
            attempt(removeBilling, t('billing.removed'));
          }}
        />
      ) : null}
    </>
  );
}
