import type { Apartment, ChargeType, MonthlyCharge } from './types';
import { roundMoney } from '../lib/money';

export interface PlannedCharge {
  chargeTypeId: number;
  amount: number;
}

function baseAmount(chargeType: ChargeType, apartment: Apartment): number {
  switch (chargeType.calculationMethod) {
    case 'per_sqm':
      return chargeType.rate * apartment.areaM2;
    case 'per_resident':
      return chargeType.rate * apartment.residentsCount;
    case 'fixed':
      return chargeType.rate;
    case 'percentage':
      return 0;
  }
}

/**
 * Plans the charges still missing for one apartment in one billing period.
 * Percentage charges are applied last, to the sum of all non-percentage charges
 * of the same apartment and period (including ones created earlier).
 */
export function planChargesForApartment(
  apartment: Apartment,
  activeChargeTypes: ChargeType[],
  existingCharges: MonthlyCharge[],
): PlannedCharge[] {
  const existingByType = new Map(existingCharges.map((charge) => [charge.chargeTypeId, charge.amount]));
  const amounts = new Map<number, number>();

  for (const chargeType of activeChargeTypes) {
    if (chargeType.calculationMethod === 'percentage') continue;
    amounts.set(chargeType.id, existingByType.get(chargeType.id) ?? roundMoney(baseAmount(chargeType, apartment)));
  }

  const subtotal = [...amounts.values()].reduce((sum, value) => sum + value, 0);

  for (const chargeType of activeChargeTypes) {
    if (chargeType.calculationMethod !== 'percentage') continue;
    amounts.set(chargeType.id, existingByType.get(chargeType.id) ?? roundMoney((subtotal * chargeType.rate) / 100));
  }

  return activeChargeTypes
    .filter((chargeType) => !existingByType.has(chargeType.id))
    .map((chargeType) => ({ chargeTypeId: chargeType.id, amount: amounts.get(chargeType.id) ?? 0 }));
}
