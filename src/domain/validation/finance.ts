import i18n from '../../i18n';
import { isValidDate } from '../../lib/periods';
import type { ChargeTypeInput } from '../../db/repositories/chargeTypesRepo';
import type { PaymentInput } from '../../db/repositories/paymentsRepo';
import type { CalculationMethod } from '../types';
import {
  fail,
  optionalText,
  parseNonNegativeNumber,
  requireText,
  type FieldErrors,
  type ValidationResult,
} from './common';

export interface ChargeTypeFormValues {
  name: string;
  calculationMethod: string;
  rate: string;
  active: boolean;
}

export interface PaymentFormValues {
  apartmentId: string;
  paymentDate: string;
  amount: string;
  description: string;
}

const METHODS: CalculationMethod[] = ['per_sqm', 'per_resident', 'fixed', 'percentage'];

export function validateChargeType(values: ChargeTypeFormValues): ValidationResult<ChargeTypeInput> {
  const errors: FieldErrors = {};
  const name = requireText(values.name, i18n.t('validation.labels.chargeName'), errors, 'name');
  const method = METHODS.find((item) => item === values.calculationMethod);
  if (!method) errors.calculationMethod = i18n.t('validation.selectMethod');
  const rate = parseNonNegativeNumber(values.rate, i18n.t('validation.labels.rate'), errors, 'rate');
  if (method === 'percentage' && rate > 100) errors.rate = i18n.t('validation.percentMax');
  if (Object.keys(errors).length > 0 || !method) return fail(errors);
  return { ok: true, data: { name, calculationMethod: method, rate, active: values.active } };
}

export function validatePayment(values: PaymentFormValues): ValidationResult<PaymentInput> {
  const errors: FieldErrors = {};
  if (!values.apartmentId) errors.apartmentId = i18n.t('validation.selectApartment');
  if (!isValidDate(values.paymentDate)) errors.paymentDate = i18n.t('validation.paymentDate');
  const amount = parseNonNegativeNumber(values.amount, i18n.t('validation.labels.amount'), errors, 'amount', { positive: true });
  const description = optionalText(values.description, errors, 'description', i18n.t('validation.labels.description'), 200);
  if (Object.keys(errors).length > 0) return fail(errors);
  return {
    ok: true,
    data: { apartmentId: Number(values.apartmentId), paymentDate: values.paymentDate, amount, description },
  };
}
