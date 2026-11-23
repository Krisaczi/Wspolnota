import i18n from '../../i18n';
import { withTransaction } from '../../db/client';
import { findAccountByCode } from '../../db/repositories/accountsRepo';
import { findApartment, type ApartmentInput } from '../../db/repositories/apartmentsRepo';
import { ACCOUNT_CODES, type JournalEntrySource } from '../../domain/accounting/types';
import { AppError } from '../../lib/errors';
import { firstError } from '../../domain/validation/common';
import { postJournalEntry, reverseSourceEntries } from './accountingService';
import { todayIso } from '../../lib/periods';

const STARTING_BALANCE_SOURCE = 'starting_balance' as const;

function source(apartmentId: number): JournalEntrySource {
  return { sourceType: STARTING_BALANCE_SOURCE, sourceId: apartmentId };
}

function postStartingBalanceEntry(apartmentId: number, apartmentNumber: string, startingBalance: number): void {
  if (startingBalance === 0) return;

  const receivables = findAccountByCode(ACCOUNT_CODES.RECEIVABLES);
  const prepayments = findAccountByCode(ACCOUNT_CODES.OWNER_PREPAYMENTS);
  const equity = findAccountByCode(ACCOUNT_CODES.STARTING_BALANCES);
  if (!receivables || !prepayments || !equity) throw new AppError(i18n.t('serviceErrors.startingBalanceNotPosted'));

  // A due balance (positive) is a receivable; an overpayment (negative) is a liability.
  const lines =
    startingBalance > 0
      ? [
          { accountId: receivables.id, debitAmount: startingBalance, creditAmount: 0 },
          { accountId: equity.id, debitAmount: 0, creditAmount: startingBalance },
        ]
      : [
          { accountId: equity.id, debitAmount: -startingBalance, creditAmount: 0 },
          { accountId: prepayments.id, debitAmount: 0, creditAmount: -startingBalance },
        ];

  const result = postJournalEntry(
    {
      entryDate: todayIso(),
      description: i18n.t('serviceErrors.startingBalanceDescription', { number: apartmentNumber }),
      lines,
    },
    source(apartmentId),
  );
  if (!result.ok) throw new AppError(firstError(result.errors));
}

/** Saves an apartment and posts (or re-posts) its starting balance to the ledger. */
export function saveApartmentWithPosting(input: ApartmentInput, id: number | null, insertFn: () => number, updateFn: () => void): void {
  withTransaction(() => {
    if (id === null) {
      const apartmentId = insertFn();
      postStartingBalanceEntry(apartmentId, input.apartmentNumber, input.startingBalance);
      return;
    }
    const current = findApartment(id);
    reverseSourceEntries(source(id));
    updateFn();
    if (current) {
      postStartingBalanceEntry(id, input.apartmentNumber, input.startingBalance);
    }
  });
}

export function removeApartmentWithPosting(id: number, deleteFn: () => void): void {
  withTransaction(() => {
    reverseSourceEntries(source(id));
    deleteFn();
  });
}
