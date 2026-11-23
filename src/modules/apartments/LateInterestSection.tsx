import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Pencil, Percent } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, TextInput } from '../../components/ui/FormFields';
import {
  deleteInterestRate,
  insertInterestRate,
  listInterestRates,
  updateInterestRate,
} from '../../db/repositories/interestRatesRepo';
import { calculateInterestBreakdown } from '../../domain/interest';
import type { InterestRate, InterestResult } from '../../domain/types';
import { formatMoney, roundMoney } from '../../lib/money';
import { formatDate, isValidDate, todayIso } from '../../lib/periods';

interface LateInterestSectionProps {
  apartmentId: number;
  apartmentNumber: string;
  balance: number;
  currency: string;
}

interface FormState {
  billingPeriod: string;
  annualRate: string;
  countingStartDate: string;
}

const emptyForm: FormState = { billingPeriod: '', annualRate: '', countingStartDate: '' };

function toForm(rate: InterestRate): FormState {
  return {
    billingPeriod: rate.billingPeriod,
    annualRate: String(rate.annualRate),
    countingStartDate: rate.countingStartDate,
  };
}

function validate(form: FormState): { period?: string; rate?: string; date?: string } {
  const errors: { period?: string; rate?: string; date?: string } = {};
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.billingPeriod)) errors.period = 'invalid';
  const rate = Number(form.annualRate);
  if (form.annualRate === '' || Number.isNaN(rate) || rate < 0) errors.rate = 'invalid';
  if (!isValidDate(form.countingStartDate)) errors.date = 'invalid';
  return errors;
}

export function LateInterestSection({ apartmentId, apartmentNumber, balance, currency }: LateInterestSectionProps) {
  const { t } = useTranslation();
  const [rates, setRates] = useState<InterestRate[]>(() => listInterestRates(apartmentId));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});
  const [deleting, setDeleting] = useState<InterestRate | null>(null);
  const [showForm, setShowForm] = useState(false);

  const refresh = () => setRates(listInterestRates(apartmentId));

  const breakdown: InterestResult[] = useMemo(
    () => calculateInterestBreakdown(Math.max(0, balance), rates, todayIso()),
    [balance, rates],
  );
  const totalInterest = useMemo(
    () => roundMoney(breakdown.reduce((sum, line) => sum + line.interest, 0)),
    [breakdown],
  );

  const startEdit = (rate: InterestRate) => {
    setEditingId(rate.id);
    setForm(toForm(rate));
    setErrors({});
    setShowForm(true);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, countingStartDate: todayIso() });
    setErrors({});
    setShowForm(true);
  };

  const submit = () => {
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    const input = {
      apartmentId,
      billingPeriod: form.billingPeriod,
      annualRate: Number(form.annualRate),
      countingStartDate: form.countingStartDate,
    };
    if (editingId === null) insertInterestRate(input);
    else updateInterestRate(editingId, input);
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    refresh();
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteInterestRate(deleting.id);
    setDeleting(null);
    refresh();
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <Percent size={16} />
          {t('interest.sectionTitle')}
        </h3>
        {!showForm && (
          <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={startAdd}>
            {t('interest.addRate')}
          </Button>
        )}
      </div>

      {balance <= 0 && rates.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('interest.noDebtNote')}</p>
      ) : null}

      {breakdown.length > 0 && (
        <table className="mb-3 w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <th className="py-2 font-medium">{t('interest.periodColumn')}</th>
              <th className="py-2 text-right font-medium">{t('interest.rateColumn')}</th>
              <th className="py-2 text-right font-medium">{t('interest.daysColumn')}</th>
              <th className="py-2 text-right font-medium">{t('interest.amountColumn')}</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((line) => (
              <tr key={`${line.period}-${line.countingStartDate}`} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                <td className="py-2 text-neutral-700 dark:text-neutral-300">{formatDate(line.countingStartDate)}</td>
                <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">{line.rate}%</td>
                <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">{line.days}</td>
                <td className="py-2 text-right font-medium text-neutral-900 dark:text-neutral-100">{formatMoney(line.interest, currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 font-semibold dark:border-neutral-800">
              <td className="py-2" colSpan={3}>{t('interest.totalLabel')}</td>
              <td className="py-2 text-right text-neutral-900 dark:text-neutral-100">{formatMoney(totalInterest, currency)}</td>
            </tr>
          </tfoot>
        </table>
      )}

      {showForm && (
        <form
          className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field label={t('interest.periodLabel')} error={errors.period ? t('interest.periodInvalid') : undefined} htmlFor="interest-period">
            <TextInput
              id="interest-period"
              type="month"
              value={form.billingPeriod}
              onChange={(event) => setForm({ ...form, billingPeriod: event.target.value })}
            />
          </Field>
          <Field label={t('interest.rateLabel')} error={errors.rate ? t('interest.rateInvalid') : undefined} htmlFor="interest-rate">
            <TextInput
              id="interest-rate"
              type="number"
              step="0.01"
              min="0"
              placeholder={t('interest.ratePlaceholder')}
              value={form.annualRate}
              onChange={(event) => setForm({ ...form, annualRate: event.target.value })}
            />
          </Field>
          <Field label={t('interest.startDateLabel')} error={errors.date ? t('interest.dateInvalid') : undefined} htmlFor="interest-start">
            <TextInput
              id="interest-start"
              type="date"
              value={form.countingStartDate}
              onChange={(event) => setForm({ ...form, countingStartDate: event.target.value })}
            />
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="submit" size="sm">{editingId === null ? t('actions.save') : t('actions.save')}</Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              {t('actions.cancel')}
            </Button>
          </div>
        </form>
      )}

      {rates.length > 0 && (
        <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {rates.map((rate) => (
            <li key={rate.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{rate.billingPeriod}</span>
                <span className="ml-2 text-neutral-500 dark:text-neutral-400">
                  {rate.annualRate}% · {t('interest.fromDate', { date: formatDate(rate.countingStartDate) })}
                </span>
              </div>
              <div className="flex gap-1">
                <IconButton label={t('interest.editRate')} onClick={() => startEdit(rate)}>
                  <Pencil size={15} />
                </IconButton>
                <IconButton label={t('interest.deleteRate')} onClick={() => setDeleting(rate)}>
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rates.length === 0 && !showForm && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('interest.empty', { number: apartmentNumber })}
        </p>
      )}

      {deleting && (
        <ConfirmDialog
          title={t('interest.deleteTitle')}
          message={t('interest.deleteMessage', { period: deleting.billingPeriod })}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
