import i18n from '../../i18n';
import { isValidDate } from '../../lib/periods';
import type { MeterReadingInput } from '../../db/repositories/metersRepo';
import { roundMoney } from '../../lib/money';
import type { ReadingView } from '../types';
import {
  fail,
  parseNonNegativeNumber,
  requireText,
  type FieldErrors,
  type ValidationResult,
} from './common';

export interface MeterReadingFormValues {
  apartmentId: string;
  meterTypeId: string;
  readingDate: string;
  readingValue: string;
  rate: string;
  advanceMonths: string;
  advanceMonthlyAmount: string;
}

/** Readings of the same apartment and meter, excluding the one being edited. */
export function validateMeterReading(
  values: MeterReadingFormValues,
  series: ReadingView[],
  editingId: number | null,
): ValidationResult<MeterReadingInput> {
  const errors: FieldErrors = {};
  if (!values.apartmentId) errors.apartmentId = i18n.t('validation.selectApartment');
  if (!values.meterTypeId) errors.meterTypeId = i18n.t('validation.selectMeterType');
  if (!isValidDate(values.readingDate)) errors.readingDate = i18n.t('validation.readingDate');
  const readingValue = parseNonNegativeNumber(
    values.readingValue,
    i18n.t('validation.labels.readingValue'),
    errors,
    'readingValue',
  );
  const rate =
    values.rate.trim() === ''
      ? null
      : parseNonNegativeNumber(values.rate, i18n.t('validation.labels.rate'), errors, 'rate');
  const advanceMonths =
    values.advanceMonths.trim() === ''
      ? 0
      : parseNonNegativeNumber(values.advanceMonths, i18n.t('settlements.form.advanceMonths'), errors, 'advanceMonths');
  const advanceMonthlyAmount =
    values.advanceMonthlyAmount.trim() === ''
      ? 0
      : parseNonNegativeNumber(
          values.advanceMonthlyAmount,
          i18n.t('settlements.form.advanceMonthlyAmount'),
          errors,
          'advanceMonthlyAmount',
        );
  if (
    !errors.advanceMonths &&
    !errors.advanceMonthlyAmount &&
    advanceMonths > 0 &&
    (!Number.isInteger(advanceMonths) || advanceMonthlyAmount <= 0)
  ) {
    errors.advanceMonthlyAmount = i18n.t('validation.advanceRequiresPositiveMonthly');
  }

  if (Object.keys(errors).length === 0) {
    const others = series.filter((reading) => reading.id !== editingId);
    if (others.some((reading) => reading.readingDate === values.readingDate)) {
      errors.readingDate = i18n.t('validation.readingDuplicate');
    }
    const previous = others
      .filter((reading) => reading.readingDate < values.readingDate)
      .sort((a, b) => b.readingDate.localeCompare(a.readingDate))[0];
    const next = others
      .filter((reading) => reading.readingDate > values.readingDate)
      .sort((a, b) => a.readingDate.localeCompare(b.readingDate))[0];
    if (previous && readingValue < previous.readingValue) {
      errors.readingValue = i18n.t('validation.readingBelowPrevious', {
        value: previous.readingValue,
        date: previous.readingDate,
      });
    }
    if (next && readingValue > next.readingValue) {
      errors.readingValue = i18n.t('validation.readingAboveNext', { value: next.readingValue, date: next.readingDate });
    }
  }

  if (Object.keys(errors).length > 0) return fail(errors);
  return {
    ok: true,
    data: {
      apartmentId: Number(values.apartmentId),
      meterTypeId: Number(values.meterTypeId),
      readingDate: values.readingDate,
      readingValue,
      rate,
      advanceMonths: Math.round(advanceMonths),
      advanceMonthlyAmount: roundMoney(advanceMonthlyAmount),
    },
  };
}

export function validateMeterTypeName(name: string): ValidationResult<string> {
  const errors: FieldErrors = {};
  const cleaned = requireText(name, i18n.t('validation.labels.meterName'), errors, 'name', 60);
  if (Object.keys(errors).length > 0) return fail(errors);
  return { ok: true, data: cleaned };
}
