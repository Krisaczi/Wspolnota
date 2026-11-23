import i18n from '../../i18n';
import { withTransaction } from '../../db/client';
import { findAccountByCode } from '../../db/repositories/accountsRepo';
import { findApartment } from '../../db/repositories/apartmentsRepo';
import { meterBalancesByApartment } from '../../db/repositories/metersRepo';
import { ACCOUNT_CODES, type JournalEntrySource } from '../../domain/accounting/types';
import { roundMoney } from '../../lib/money';
import { AppError } from '../../lib/errors';
import { firstError } from '../../domain/validation/common';
import { postJournalEntry, reverseSourceEntries } from './accountingService';
import { todayIso } from '../../lib/periods';

const METER_SOURCE = 'meter' as const;

function meterSource(apartmentId: number): JournalEntrySource {
  return { sourceType: METER_SOURCE, sourceId: apartmentId };
}

/** Re-posts the apartment's total meter settlement as a single journal entry on 1100 (due) or 2010 (credit). */
export function repostMeterEntryForApartment(apartmentId: number): void {
  withTransaction(() => {
    const apartment = findApartment(apartmentId);
    if (!apartment) return;

    reverseSourceEntries(meterSource(apartmentId));

    const total = meterBalancesByApartment().get(apartmentId);
    if (total === undefined || total === 0) return;

    const receivables = findAccountByCode(ACCOUNT_CODES.RECEIVABLES);
    const prepayments = findAccountByCode(ACCOUNT_CODES.OWNER_PREPAYMENTS);
    const income = findAccountByCode(ACCOUNT_CODES.METER_SETTLEMENTS);
    if (!receivables || !prepayments || !income) throw new AppError(i18n.t('serviceErrors.meterNotPosted'));

    const due = roundMoney(Math.max(0, total));
    const credit = roundMoney(Math.max(0, -total));
    const lines = [
      { accountId: receivables.id, debitAmount: due, creditAmount: 0 },
      { accountId: prepayments.id, debitAmount: 0, creditAmount: credit },
      { accountId: income.id, debitAmount: 0, creditAmount: due },
      { accountId: income.id, debitAmount: credit, creditAmount: 0 },
    ];
    const nonZero = lines.filter((line) => line.debitAmount !== 0 || line.creditAmount !== 0);

    const result = postJournalEntry(
      {
        entryDate: todayIso(),
        description: i18n.t('serviceErrors.meterDescription', { number: apartment.apartmentNumber }),
        lines: nonZero,
      },
      meterSource(apartmentId),
    );
    if (!result.ok) throw new AppError(firstError(result.errors));
  });
}
