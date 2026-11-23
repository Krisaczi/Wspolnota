import i18n from '../i18n';
import { lastInsertId, withTransaction } from '../db/client';
import { listApartments } from '../db/repositories/apartmentsRepo';
import { findAccountByCode } from '../db/repositories/accountsRepo';
import { listChargeTypes } from '../db/repositories/chargeTypesRepo';
import {
  deleteChargesForPeriod,
  insertMonthlyCharge,
  listChargesForPeriod,
} from '../db/repositories/monthlyChargesRepo';
import { planChargesForApartment } from '../domain/billing';
import { ACCOUNT_CODES } from '../domain/accounting/types';
import { periodDateRange } from '../lib/periods';
import { AppError } from '../lib/errors';
import type { MonthlyCharge } from '../domain/types';
import { postJournalEntry, reverseSourceEntries } from './accounting/accountingService';

export interface BillingResult {
  created: number;
  alreadyBilled: number;
}

const BILLING_SOURCE = 'billing' as const;

function postChargeEntry(
  chargeId: number,
  period: string,
  receivablesId: number,
  feesId: number,
  apartmentNumber: string,
  amount: number,
): void {
  const result = postJournalEntry(
    {
      entryDate: periodDateRange(period).to,
      description: i18n.t('serviceErrors.monthlyChargeDescription', { number: apartmentNumber }),
      lines: [
        { accountId: receivablesId, debitAmount: amount, creditAmount: 0 },
        { accountId: feesId, debitAmount: 0, creditAmount: amount },
      ],
    },
    { sourceType: BILLING_SOURCE, sourceId: chargeId },
  );
  if (!result.ok) {
    throw new AppError(i18n.t('serviceErrors.chargeNotPosted', { number: apartmentNumber }));
  }
}

export function generateBilling(period: string): BillingResult {
  return withTransaction(() => {
    const apartments = listApartments().filter((apartment) => apartment.active);
    const chargeTypes = listChargeTypes().filter((chargeType) => chargeType.active);
    const receivables = findAccountByCode(ACCOUNT_CODES.RECEIVABLES);
    const fees = findAccountByCode(ACCOUNT_CODES.MONTHLY_FEES);
    if (chargeTypes.length === 0) {
      throw new AppError(i18n.t('serviceErrors.noActiveChargeTypes'));
    }
    if (apartments.length === 0) {
      throw new AppError(i18n.t('serviceErrors.noActiveApartments'));
    }
    if (!receivables || !fees) {
      throw new AppError(i18n.t('serviceErrors.paymentNotPosted'));
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
        postChargeEntry(lastInsertId(), period, receivables.id, fees.id, apartment.apartmentNumber, planned.amount);
        created += 1;
      }
    }

    return { created, alreadyBilled };
  });
}

export function removeBillingForPeriod(period: string): number {
  return withTransaction(() => {
    for (const charge of listChargesForPeriod(period)) {
      reverseSourceEntries({ sourceType: BILLING_SOURCE, sourceId: charge.id });
    }
    return deleteChargesForPeriod(period);
  });
}
