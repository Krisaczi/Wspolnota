import i18n from '../i18n';
import type { CalculationMethod, ChargeType } from '../domain/types';
import { formatNumber } from './money';

export function calculationMethodLabel(method: CalculationMethod): string {
  return i18n.t(`billing.methods.${method}.label`);
}

export function calculationMethodHelp(method: CalculationMethod): string {
  return i18n.t(`billing.methods.${method}.help`);
}

function rateUnitLabel(method: CalculationMethod): string {
  return i18n.t(`billing.methods.${method}.unit`);
}

export function describeChargeRate(chargeType: ChargeType, currency: string): string {
  if (chargeType.calculationMethod === 'percentage') {
    return `${formatNumber(chargeType.rate, 2)}% ${rateUnitLabel('percentage')}`;
  }
  return `${formatNumber(chargeType.rate, 2)} ${currency} ${rateUnitLabel(chargeType.calculationMethod)}`;
}
