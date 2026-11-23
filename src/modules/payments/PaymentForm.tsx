import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Field, SelectInput, TextInput } from '../../components/ui/FormFields';
import { Modal } from '../../components/ui/Modal';
import type { PaymentInput } from '../../db/repositories/paymentsRepo';
import type { PaymentAllocationInput } from '../../db/repositories/paymentAllocationsRepo';
import { validatePayment, validatePaymentAllocations, type PaymentAllocationFormValue, type PaymentFormValues } from '../../domain/validation/finance';
import type { FieldErrors } from '../../domain/validation/common';
import { CHARGE_CATEGORIES } from '../../domain/accounting/chargeCategories';
import type { ApartmentView, PaymentView } from '../../domain/types';
import { formatNumber, parseAmountInput, roundMoney } from '../../lib/money';
import { todayIso } from '../../lib/periods';

const FORM_ID = 'payment-form';

interface PaymentFormProps {
  payment: PaymentView | null;
  apartments: ApartmentView[];
  defaultApartmentId: number | null;
  initialAllocations: PaymentAllocationInput[] | null;
  currency: string;
  onSubmit: (input: PaymentInput) => void;
  onClose: () => void;
}

  const EMPTY_ALLOCATION: PaymentAllocationFormValue = { chargeCategory: '', amount: '', note: '' };

export function PaymentForm({ payment, apartments, defaultApartmentId, initialAllocations, currency, onSubmit, onClose }: PaymentFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<PaymentFormValues>({
    apartmentId: payment
      ? String(payment.apartmentId)
      : defaultApartmentId === null
        ? ''
        : String(defaultApartmentId),
    paymentDate: payment?.paymentDate ?? todayIso(),
    amount: payment ? String(payment.amount) : '',
    description: payment?.description ?? '',
  });
  const [allocations, setAllocations] = useState<PaymentAllocationFormValue[]>(
    initialAllocations && initialAllocations.length > 0
      ? initialAllocations.map((allocation) => ({
          chargeCategory: allocation.chargeCategory,
          amount: formatNumber(allocation.amount),
          note: allocation.note ?? '',
        }))
      : [],
  );
  const [allocationError, setAllocationError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = (key: keyof PaymentFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const updateAllocation = (index: number, patch: Partial<PaymentAllocationFormValue>) => {
    setAllocations((current) => current.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  };

  const removeAllocation = (index: number) => {
    setAllocations((current) => current.filter((_, position) => position !== index));
  };

  const paymentAmount = useMemo(() => parseAmountInput(values.amount), [values.amount]);
  const allocatedTotal = useMemo(
    () =>
      roundMoney(
        allocations.reduce((sum, row) => {
          const rowAmount = row.amount.trim() === '' ? 0 : parseAmountInput(row.amount);
          return sum + (Number.isFinite(rowAmount) ? rowAmount : 0);
        }, 0),
      ),
    [allocations],
  );
  const remaining = roundMoney(paymentAmount - allocatedTotal);
  const balanced = allocations.length > 0 && remaining === 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validatePayment(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setAllocationError(null);
    setRowErrors({});
    let input: PaymentInput = result.data;
    if (allocations.length > 0 || initialAllocations !== null) {
      const allocationResult = validatePaymentAllocations(result.data.amount, allocations);
      if (!allocationResult.ok) {
        setAllocationError(allocationResult.error);
        setRowErrors(allocationResult.rowErrors);
        return;
      }
      input = { ...input, allocations: allocationResult.data };
    }
    onSubmit(input);
  };

  return (
    <Modal
      title={payment ? t('payments.form.editTitle') : t('payments.recordPayment')}
      description={t('payments.form.description')}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {payment ? t('actions.saveChanges') : t('payments.recordPayment')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={t('apartments.columns.apartment')} htmlFor="paymentApartment" error={errors.apartmentId}>
            <SelectInput
              id="paymentApartment"
              value={values.apartmentId}
              error={errors.apartmentId}
              onChange={(event) => update('apartmentId', event.target.value)}
            >
              <option value="">{t('apartments.selectApartment')}</option>
              {apartments.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.apartmentNumber} - {apartment.ownerName ?? t('apartments.noOwner')}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t('payments.form.date')} htmlFor="paymentDate" error={errors.paymentDate}>
            <TextInput
              id="paymentDate"
              type="date"
              value={values.paymentDate}
              error={errors.paymentDate}
              onChange={(event) => update('paymentDate', event.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={t('payments.form.amount', { currency })} htmlFor="paymentAmount" error={errors.amount}>
            <TextInput
              id="paymentAmount"
              inputMode="decimal"
              placeholder="0,00"
              value={values.amount}
              error={errors.amount}
              onChange={(event) => update('amount', event.target.value)}
              className="text-right tabular-nums"
            />
          </Field>
          <Field label={t('payments.form.descriptionOptional')} htmlFor="paymentDescription" error={errors.description}>
            <TextInput
              id="paymentDescription"
              placeholder={t('payments.form.descriptionPlaceholder')}
              value={values.description}
              error={errors.description}
              onChange={(event) => update('description', event.target.value)}
            />
          </Field>
        </div>

        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('payments.allocation.title')}</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setAllocations((current) => [...current, { ...EMPTY_ALLOCATION }])}
            >
              {t('payments.allocation.addLine')}
            </Button>
          </div>

          {allocations.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('payments.allocation.hint')}</p>
          ) : (
            <div className="space-y-2">
              {allocations.map((row, index) => (
                <div key={index} className="grid grid-cols-12 items-start gap-2">
                  <div className="col-span-12 sm:col-span-6">
                    <SelectInput
                      aria-label={t('payments.allocation.categoryFor', { line: index + 1 })}
                      value={row.chargeCategory}
                      error={rowErrors[index]}
                      onChange={(event) => updateAllocation(index, { chargeCategory: event.target.value })}
                    >
                      <option value="">{t('payments.allocation.chooseCategory')}</option>
                      {CHARGE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {t(`payments.allocation.categories.${category}`)}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <TextInput
                      aria-label={t('payments.allocation.amountFor', { line: index + 1 })}
                      inputMode="decimal"
                      placeholder="0,00"
                      value={row.amount}
                      error={rowErrors[index]}
                      onChange={(event) => updateAllocation(index, { amount: event.target.value })}
                      className="text-right tabular-nums"
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <TextInput
                      aria-label={t('payments.allocation.noteFor', { line: index + 1 })}
                      placeholder={t('payments.allocation.notePlaceholder')}
                      value={row.note}
                      onChange={(event) => updateAllocation(index, { note: event.target.value })}
                    />
                  </div>
                  <div className="col-span-2 flex justify-end sm:col-span-1">
                    <IconButton
                      label={t('payments.allocation.removeLine')}
                      tone="danger"
                      disabled={allocations.length <= 1}
                      onClick={() => removeAllocation(index)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}

          {allocations.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-neutral-200 pt-3 text-sm tabular-nums dark:border-neutral-800">
              <span className="text-neutral-600 dark:text-neutral-400">
                {t('payments.allocation.allocated')}{' '}
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatNumber(allocatedTotal)}</span>
              </span>
              <span className="text-neutral-600 dark:text-neutral-400">
                {t('payments.allocation.remaining')}{' '}
                <span
                  className={
                    remaining === 0
                      ? 'font-semibold text-success-700 dark:text-success-500'
                      : remaining > 0
                        ? 'font-semibold text-warning-700 dark:text-warning-500'
                        : 'font-semibold text-error-700 dark:text-error-500'
                  }
                >
                  {formatNumber(remaining)}
                </span>
              </span>
              <span
                className={
                  balanced
                    ? 'font-medium text-success-700 dark:text-success-500'
                    : 'font-medium text-error-700 dark:text-error-500'
                }
              >
                {balanced ? t('payments.allocation.balanced') : t('payments.allocation.notBalanced')}
              </span>
            </div>
          ) : null}

          {allocationError ? (
            <p role="alert" className="mt-3 text-sm font-medium text-error-700 dark:text-error-500">
              {allocationError}
            </p>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
