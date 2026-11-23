import i18n from '../../i18n';
import { withTransaction } from '../../db/client';
import { findAccountByCode } from '../../db/repositories/accountsRepo';
import { findApartment } from '../../db/repositories/apartmentsRepo';
import { sumChargesByApartment } from '../../db/repositories/monthlyChargesRepo';
import { deletePayment, insertPayment, updatePayment, type PaymentInput } from '../../db/repositories/paymentsRepo';
import {
  deletePaymentAllocations,
  receivablePaymentsByApartment,
} from '../../db/repositories/paymentAllocationsRepo';
import { ACCOUNT_CODES } from '../../domain/accounting/types';
import { roundMoney } from '../../lib/money';
import { AppError } from '../../lib/errors';
import { firstError } from '../../domain/validation/common';
import { postJournalEntry, reverseSourceEntries } from './accountingService';

const PAYMENT_SOURCE = 'payment' as const;

/** Splits a payment into the part settling existing debt (receivables) and the overpayment (prepayments). */
function splitPayment(apartmentId: number, amount: number, upToMonth: string): { settled: number; prepaid: number } {
  const charges = sumChargesByApartment(upToMonth).get(apartmentId) ?? 0;
  const starting = findApartment(apartmentId)?.startingBalance ?? 0;
  // Includes this payment in full (it is stored unallocated at this point); other allocated
  // payments count only the portion that settles obligations (everything but overpayment).
  const receivableTotal = receivablePaymentsByApartment(upToMonth).get(apartmentId) ?? 0;
  const debtBefore = roundMoney(charges + starting - (receivableTotal - amount));
  const settled = roundMoney(Math.min(amount, Math.max(0, debtBefore)));
  return { settled, prepaid: roundMoney(amount - settled) };
}

/**
 * Posts the payment: full debit to bank, credit to 1100 Receivables (and 2010 for overpayment).
 * Allocation categories never touch revenue accounts — they only record which obligations are settled.
 */
function postPaymentEntry(paymentId: number, input: PaymentInput): void {
  const apartment = findApartment(input.apartmentId);
  const bank = findAccountByCode(ACCOUNT_CODES.BANK);
  const receivables = findAccountByCode(ACCOUNT_CODES.RECEIVABLES);
  const prepayments = findAccountByCode(ACCOUNT_CODES.OWNER_PREPAYMENTS);
  if (!apartment || !bank || !receivables || !prepayments) throw new AppError(i18n.t('serviceErrors.paymentNotPosted'));

  let settled: number;
  let prepaid: number;
  if (input.allocations && input.allocations.length > 0) {
    const overpayment = roundMoney(
      input.allocations.filter((a) => a.chargeCategory === 'overpayment').reduce((sum, a) => sum + a.amount, 0),
    );
    settled = roundMoney(input.amount - overpayment);
    prepaid = overpayment;
  } else {
    ({ settled, prepaid } = splitPayment(input.apartmentId, input.amount, input.paymentDate.slice(0, 7)));
  }

  const lines = [{ accountId: bank.id, debitAmount: input.amount, creditAmount: 0 }];
  if (settled > 0) {
    lines.push({ accountId: receivables.id, debitAmount: 0, creditAmount: settled });
  }
  if (prepaid > 0) {
    lines.push({ accountId: prepayments.id, debitAmount: 0, creditAmount: prepaid });
  }

  const result = postJournalEntry(
    {
      entryDate: input.paymentDate,
      description: input.description ?? i18n.t('serviceErrors.ownerPaymentDescription', { number: apartment.apartmentNumber }),
      lines,
    },
    { sourceType: PAYMENT_SOURCE, sourceId: paymentId },
  );
  if (!result.ok) throw new AppError(firstError(result.errors));
}

export function savePayment(input: PaymentInput, id: number | null): void {
  withTransaction(() => {
    if (id === null) {
      postPaymentEntry(insertPayment(input), input);
      return;
    }
    reverseSourceEntries({ sourceType: PAYMENT_SOURCE, sourceId: id });
    if (input.allocations) deletePaymentAllocations(id);
    updatePayment(id, input);
    postPaymentEntry(id, input);
  });
}

export function removePayment(id: number): void {
  withTransaction(() => {
    reverseSourceEntries({ sourceType: PAYMENT_SOURCE, sourceId: id });
    deletePayment(id);
  });
}
