import i18n from '../i18n';
import { listApartments } from '../db/repositories/apartmentsRepo';
import { listChargeTypes } from '../db/repositories/chargeTypesRepo';
import {
  deleteChargesForPeriod,
  insertMonthlyCharge,
  listChargesForPeriod,
} from '../db/repositories/monthlyChargesRepo';
import { withTransaction } from '../db/client';
import { planChargesForApartment } from '../domain/billing';
import { AppError } from '../lib/errors';
import type { MonthlyCharge } from '../domain/types';

export interface BillingResult {
  created: number;
  alreadyBilled: number;
}

export function generateBilling(period: string): BillingResult {
  return withTransaction(() => {
    const apartments = listApartments().filter((apartment) => apartment.active);
    const chargeTypes = listChargeTypes().filter((chargeType) => chargeType.active);
    if (chargeTypes.length === 0) {
      throw new AppError(i18n.t('serviceErrors.noActiveChargeTypes'));
    }
    if (apartments.length === 0) {
      throw new AppError(i18n.t('serviceErrors.noActiveApartments'));
    }

    const existingByApartment = new Map<number, MonthlyCharge[]>();
    for (const charge of listChargesForPeriod(period)) {
      const list = existingByApartment.get(charge.apartmentId) ?? [];
      list.push(charge);
      existingByApartment.set(charge.apartmentId, list);
    }

    let created = 0;
    let alreadyBilled = 0;
    for (const apartment of apartments) {
      const existing = existingByApartment.get(apartment.id) ?? [];
      alreadyBilled += existing.filter((charge) => chargeTypes.some((type) => type.id === charge.chargeTypeId)).length;

      for (const planned of planChargesForApartment(apartment, chargeTypes, existing)) {
        insertMonthlyCharge({
          apartmentId: apartment.id,
          chargeTypeId: planned.chargeTypeId,
          billingPeriod: period,
          amount: planned.amount,
        });
        created += 1;
      }
    }

    return { created, alreadyBilled };
  });
}

export function removeBillingForPeriod(period: string): number {
  return withTransaction(() => deleteChargesForPeriod(period));
}
