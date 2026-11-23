import i18n from '../../i18n';
import { withTransaction } from '../../db/client';
import { findAccountByCode } from '../../db/repositories/accountsRepo';
import type { OtherIncomeInput } from '../../domain/accounting/types';
import {
  deleteOtherIncome,
  insertOtherIncome,
  updateOtherIncome,
} from '../../db/repositories/otherIncomeRepo';
import { ACCOUNT_CODES, type JournalEntrySource } from '../../domain/accounting/types';
import { AppError } from '../../lib/errors';
import { firstError } from '../../domain/validation/common';
import { postJournalEntry, reverseSourceEntries } from './accountingService';

const INCOME_SOURCE = 'other_income' as const;

function source(id: number): JournalEntrySource {
  return { sourceType: INCOME_SOURCE, sourceId: id };
}

/** Posts bank income: Dr 1010 Bank Account / Cr 7020 (interest) or 7090 (other). */
function postIncomeEntry(incomeId: number, input: OtherIncomeInput): void {
  const bank = findAccountByCode(ACCOUNT_CODES.BANK);
  const incomeAccount = findAccountByCode(
    input.incomeType === 'interest' ? ACCOUNT_CODES.INTEREST_INCOME : ACCOUNT_CODES.OTHER_INCOME,
  );
  if (!bank || !incomeAccount) throw new AppError(i18n.t('serviceErrors.otherIncomeNotPosted'));

  const result = postJournalEntry(
    {
      entryDate: input.incomeDate,
      description: i18n.t(input.incomeType === 'interest' ? 'serviceErrors.interestDescription' : 'serviceErrors.otherIncomeDescription', {
        id: incomeId,
      }),
      lines: [
        { accountId: bank.id, debitAmount: input.amount, creditAmount: 0 },
        { accountId: incomeAccount.id, debitAmount: 0, creditAmount: input.amount },
      ],
    },
    source(incomeId),
  );
  if (!result.ok) throw new AppError(firstError(result.errors));
}

export function saveOtherIncomeWithPosting(input: OtherIncomeInput, id: number | null): void {
  withTransaction(() => {
    if (id === null) {
      const incomeId = insertOtherIncome(input);
      postIncomeEntry(incomeId, input);
      return;
    }
    reverseSourceEntries(source(id));
    updateOtherIncome(id, input);
    postIncomeEntry(id, input);
  });
}

export function removeOtherIncomeWithPosting(id: number): void {
  withTransaction(() => {
    reverseSourceEntries(source(id));
    deleteOtherIncome(id);
  });
}
