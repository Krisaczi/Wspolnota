import i18n from '../../i18n';
import { withTransaction } from '../../db/client';
import { findAccountByCode } from '../../db/repositories/accountsRepo';
import { findApartment } from '../../db/repositories/apartmentsRepo';
import { deletePayment, insertPayment, updatePayment, type PaymentInput } from '../../db/repositories/paymentsRepo';
import { ACCOUNT_CODES } from '../../domain/accounting/types';
import { AppError } from '../../lib/errors';
import { firstError } from '../../domain/validation/common';
import { postJournalEntry, reverseSourceEntries } from './accountingService';

const PAYMENT_SOURCE = 'payment' as const;

function postPaymentEntry(paymentId: number, input: PaymentInput): void {
  const apartment = findApartment(input.apartmentId);
  const bank = findAccountByCode(ACCOUNT_CODES.BANK);
  const fees = findAccountByCode(ACCOUNT_CODES.MONTHLY_FEES);
  if (!apartment || !bank || !fees) throw new AppError(i18n.t('serviceErrors.paymentNotPosted'));

  const result = postJournalEntry(
    {
      entryDate: input.paymentDate,
      description: input.description ?? i18n.t('serviceErrors.ownerPaymentDescription', { number: apartment.apartmentNumber }),
      lines: [
        { accountId: bank.id, debitAmount: input.amount, creditAmount: 0 },
        { accountId: fees.id, debitAmount: 0, creditAmount: input.amount },
      ],
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
