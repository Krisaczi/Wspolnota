import i18n from '../../i18n';
import { withTransaction } from '../../db/client';
import {
  deleteAccount,
  findAccount,
  insertAccount,
  listAccounts,
  listTakenCodes,
  setAccountActive,
  updateAccount,
} from '../../db/repositories/accountsRepo';
import { insertAuditEntry } from '../../db/repositories/auditRepo';
import {
  findJournalEntry,
  insertJournalEntry,
  insertJournalLine,
  listActiveSourceEntryIds,
  listLinesForEntry,
  sumLinesForEntry,
} from '../../db/repositories/journalEntriesRepo';
import type { JournalEntryInput, JournalEntrySource } from '../../domain/accounting/types';
import { roundMoney } from '../../lib/money';
import { AppError } from '../../lib/errors';
import { fail, firstError, type ValidationResult } from '../../domain/validation/common';
import { validateAccountInput, validateJournalEntryInput } from '../../domain/validation/accounting';

export interface AccountFormValues {
  code: string;
  name: string;
  type: string;
  openingBalance: string;
  openingBalanceDate: string;
}

export function saveAccount(values: AccountFormValues, id: number | null): ValidationResult<number> {
  const result = validateAccountInput(values, listTakenCodes(id));
  if (!result.ok) return result;
  const input = result.data;

  if (id === null) {
    const newId = withTransaction(() => {
      const accountId = insertAccount(input);
      insertAuditEntry({
        action: 'create',
        entity: 'account',
        entityId: accountId,
        summary: `Created account ${input.code} ${input.name}`,
      });
      return accountId;
    });
    return { ok: true, data: newId };
  }

  const current = requireAccount(id);
  if (current.type !== input.type && (current.systemAccount || current.hasTransactions)) {
    return fail({
      type: current.systemAccount
        ? i18n.t('serviceErrors.systemAccountsKeepType')
        : i18n.t('serviceErrors.typeLocked'),
    });
  }

  withTransaction(() => {
    updateAccount(id, input);
    insertAuditEntry({
      action: 'update',
      entity: 'account',
      entityId: id,
      summary: `Updated account ${current.code} ${current.name} to ${input.code} ${input.name}`,
    });
  });
  return { ok: true, data: id };
}

export function setAccountArchived(id: number, archived: boolean): void {
  const account = requireAccount(id);
  if (archived && account.systemAccount) throw new AppError(i18n.t('serviceErrors.systemNoArchive'));
  if (archived === !account.active) return;

  withTransaction(() => {
    setAccountActive(id, !archived);
    insertAuditEntry({
      action: archived ? 'archive' : 'reactivate',
      entity: 'account',
      entityId: id,
      summary: `${archived ? 'Archived' : 'Reactivated'} account ${account.code} ${account.name}`,
    });
  });
}

export function removeAccount(id: number): void {
  const account = requireAccount(id);
  if (account.systemAccount) throw new AppError(i18n.t('serviceErrors.systemNoDelete'));
  if (account.hasTransactions) {
    throw new AppError(i18n.t('serviceErrors.accountHasTransactions'));
  }

  withTransaction(() => {
    deleteAccount(id);
    insertAuditEntry({
      action: 'delete',
      entity: 'account',
      entityId: id,
      summary: `Deleted account ${account.code} ${account.name}`,
    });
  });
}

export function postJournalEntry(
  input: JournalEntryInput,
  source: JournalEntrySource | null = null,
  reversalOfId: number | null = null,
): ValidationResult<number> {
  const accounts = new Map(
    listAccounts().map((account) => [account.id, { id: account.id, active: account.active, type: account.type }]),
  );
  const result = validateJournalEntryInput(input, accounts);
  if (!result.ok) return result;
  const entry = result.data;

  const entryId = withTransaction(() => {
    const id = insertJournalEntry({
      entryDate: entry.entryDate,
      description: entry.description,
      source,
      reversalOfId,
    });
    for (const line of entry.lines) {
      if (line.accountId === null) throw new AppError(i18n.t('serviceErrors.lineNeedsAccount'));
      insertJournalLine(id, { accountId: line.accountId, debitAmount: line.debitAmount, creditAmount: line.creditAmount });
    }

    const totals = sumLinesForEntry(id);
    if (roundMoney(totals.debit) !== roundMoney(totals.credit)) {
      throw new AppError(i18n.t('serviceErrors.notBalanced'));
    }

    insertAuditEntry({
      action: reversalOfId === null ? 'post' : 'reverse',
      entity: 'journal_entry',
      entityId: id,
      summary: `${entry.description} on ${entry.entryDate} for ${roundMoney(totals.debit).toFixed(2)}`,
    });
    return id;
  });
  return { ok: true, data: entryId };
}

export function reverseJournalEntry(entryId: number): number {
  const entry = findJournalEntry(entryId);
  if (!entry) throw new AppError(i18n.t('serviceErrors.entryMissing'));
  if (entry.reversed) throw new AppError(i18n.t('serviceErrors.alreadyReversed'));
  if (entry.reversalOfId !== null) throw new AppError(i18n.t('serviceErrors.reversalNotReversible'));

  const reversal = postJournalEntry(
    {
      entryDate: entry.entryDate,
      description: i18n.t('serviceErrors.reversalPrefix', { description: entry.description }).slice(0, 200),
      lines: listLinesForEntry(entryId).map((line) => ({
        accountId: line.accountId,
        debitAmount: line.creditAmount,
        creditAmount: line.debitAmount,
      })),
    },
    null,
    entryId,
  );
  if (!reversal.ok) throw new AppError(firstError(reversal.errors));
  return reversal.data;
}

export function reverseSourceEntries(source: JournalEntrySource): void {
  for (const entryId of listActiveSourceEntryIds(source)) reverseJournalEntry(entryId);
}

function requireAccount(id: number) {
  const account = findAccount(id);
  if (!account) throw new AppError(i18n.t('errors.accountMissing'));
  return account;
}
