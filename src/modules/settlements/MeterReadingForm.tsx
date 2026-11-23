import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/FormFields';
import { Modal } from '../../components/ui/Modal';
import type { MeterReadingInput } from '../../db/repositories/metersRepo';
import { validateMeterReading, type MeterReadingFormValues } from '../../domain/validation/metering';
import type { FieldErrors } from '../../domain/validation/common';
import type { ReadingView } from '../../domain/types';
import { formatMoney, parseAmountInput } from '../../lib/money';
import { useSettingsStore } from '../../stores/settingsStore';
import { todayIso } from '../../lib/periods';

const FORM_ID = 'meter-reading-form';

interface MeterReadingFormProps {
  reading: ReadingView | null;
  apartmentId: number;
  meterTypeId: number;
  apartmentNumber: string;
  meterTypeName: string;
  series: ReadingView[];
  onSubmit: (input: MeterReadingInput) => void;
  onClose: () => void;
}

export function MeterReadingForm({
  reading,
  apartmentId,
  meterTypeId,
  apartmentNumber,
  meterTypeName,
  series,
  onSubmit,
  onClose,
}: MeterReadingFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Pick<MeterReadingFormValues, 'readingDate' | 'readingValue' | 'rate' | 'advanceMonths' | 'advanceMonthlyAmount'>>({
    readingDate: reading?.readingDate ?? todayIso(),
    readingValue: reading ? String(reading.readingValue) : '',
    rate: reading?.rate !== null && reading?.rate !== undefined ? String(reading.rate) : '',
    advanceMonths: reading?.advanceMonths ? String(reading.advanceMonths) : '',
    advanceMonthlyAmount: reading?.advanceMonthlyAmount ? String(reading.advanceMonthlyAmount) : '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const currency = useSettingsStore((state) => state.settings.currency);
  const advanceTotal = parseAmountInput(values.advanceMonths) * parseAmountInput(values.advanceMonthlyAmount);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateMeterReading(
      {
        apartmentId: String(apartmentId),
        meterTypeId: String(meterTypeId),
        readingDate: values.readingDate,
        readingValue: values.readingValue,
        rate: values.rate,
        advanceMonths: values.advanceMonths,
        advanceMonthlyAmount: values.advanceMonthlyAmount,
      },
      series,
      reading?.id ?? null,
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.data);
  };

  return (
    <Modal
      title={reading ? t('settlements.form.editTitle') : t('settlements.form.addTitle')}
      description={t('settlements.form.description', { number: apartmentNumber, meter: meterTypeName })}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {reading ? t('actions.saveChanges') : t('settlements.addReading')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t('settlements.form.readingDate')} htmlFor="readingDate" error={errors.readingDate}>
          <TextInput
            id="readingDate"
            type="date"
            value={values.readingDate}
            error={errors.readingDate}
            onChange={(event) => setValues((current) => ({ ...current, readingDate: event.target.value }))}
          />
        </Field>
        <Field
          label={t('settlements.form.meterReading')}
          htmlFor="readingValue"
          error={errors.readingValue}
          hint={t('settlements.form.meterReadingHint')}
        >
          <TextInput
            id="readingValue"
            inputMode="decimal"
            autoFocus
            placeholder={t('settlements.form.meterReadingPlaceholder')}
            value={values.readingValue}
            error={errors.readingValue}
            onChange={(event) => setValues((current) => ({ ...current, readingValue: event.target.value }))}
          />
        </Field>
        <Field
          label={t('settlements.form.rate')}
          htmlFor="rate"
          error={errors.rate}
          hint={t('settlements.form.rateHint')}
        >
          <TextInput
            id="rate"
            inputMode="decimal"
            placeholder={t('settlements.form.ratePlaceholder')}
            value={values.rate}
            error={errors.rate}
            onChange={(event) => setValues((current) => ({ ...current, rate: event.target.value }))}
          />
        </Field>
        <Field
          label={t('settlements.form.advanceMonths')}
          htmlFor="advanceMonths"
          error={errors.advanceMonths}
          hint={t('settlements.form.advanceMonthsHint')}
        >
          <TextInput
            id="advanceMonths"
            inputMode="numeric"
            placeholder="0"
            value={values.advanceMonths}
            error={errors.advanceMonths}
            onChange={(event) => setValues((current) => ({ ...current, advanceMonths: event.target.value }))}
          />
        </Field>
        <Field
          label={t('settlements.form.advanceMonthlyAmount')}
          htmlFor="advanceMonthlyAmount"
          error={errors.advanceMonthlyAmount}
          hint={t('settlements.form.advanceAmountHint')}
        >
          <TextInput
            id="advanceMonthlyAmount"
            inputMode="decimal"
            placeholder="0.00"
            value={values.advanceMonthlyAmount}
            error={errors.advanceMonthlyAmount}
            onChange={(event) => setValues((current) => ({ ...current, advanceMonthlyAmount: event.target.value }))}
          />
        </Field>
        <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300 sm:col-span-2">
          {t('settlements.form.advanceTotal', {
            amount: formatMoney(advanceTotal, currency),
          })}
        </div>
      </form>
    </Modal>
  );
}
