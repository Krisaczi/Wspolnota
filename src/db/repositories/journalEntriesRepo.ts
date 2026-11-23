import type {
  AccountTotals,
  AccountType,
  DateRange,
  JournalEntry,
  JournalEntrySource,
  JournalLine,
} from '../../domain/accounting/types';
import { execute, lastInsertId, queryRows, type Row, type SqlParam } from '../client';

export interface JournalEntryInsert {
  entryDate: string;
  description: string;
  source: JournalEntrySource | null;
  reversalOfId: number | null;
}

export interface JournalLineInsert {
  accountId: number;
  debitAmount: number;
  creditAmount: number;
}

export interface PeriodAccountTotals {
  period: string;
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
}

const ENTRY_SELECT = `
  SELECT e.id, e.entry_date, e.description, e.created_at, e.source_type, e.source_id, e.reversal_of_id,
         (SELECT COALESCE(SUM(l.debit_amount), 0) FROM journal_entry_lines l WHERE l.journal_entry_id = e.id) AS total_amount,
         EXISTS (SELECT 1 FROM journal_entries r WHERE r.reversal_of_id = e.id) AS reversed
    FROM journal_entries e`;

function mapEntry(row: Row): JournalEntry {
  return {
    id: Number(row.id),
    entryDate: String(row.entry_date),
    description: String(row.description),
    createdAt: String(row.created_at),
    sourceType: row.source_type === null ? null : String(row.source_type),
    sourceId: row.source_id === null ? null : Number(row.source_id),
    reversalOfId: row.reversal_of_id === null ? null : Number(row.reversal_of_id),
    totalAmount: Number(row.total_amount),
    reversed: Number(row.reversed) === 1,
  };
}

const LINE_SELECT = `
  SELECT l.id, l.journal_entry_id, l.account_id, l.debit_amount, l.credit_amount,
         a.code, a.name, a.type
    FROM journal_entry_lines l
    JOIN accounts a ON a.id = l.account_id`;

function mapLine(row: Row): JournalLine {
  return {
    id: Number(row.id),
    journalEntryId: Number(row.journal_entry_id),
    accountId: Number(row.account_id),
    accountCode: String(row.code),
    accountName: String(row.name),
    accountType: String(row.type) as AccountType,
    debitAmount: Number(row.debit_amount),
    creditAmount: Number(row.credit_amount),
  };
}

export function listJournalEntries(range: DateRange): JournalEntry[] {
  return queryRows(
    `${ENTRY_SELECT} WHERE e.entry_date BETWEEN ? AND ? ORDER BY e.entry_date DESC, e.id DESC`,
    [range.from, range.to],
  ).map(mapEntry);
}

export function findJournalEntry(id: number): JournalEntry | null {
  const rows = queryRows(`${ENTRY_SELECT} WHERE e.id = ?`, [id]);
  return rows.length === 0 ? null : mapEntry(rows[0]);
}

export function listLinesForEntry(entryId: number): JournalLine[] {
  return queryRows(`${LINE_SELECT} WHERE l.journal_entry_id = ? ORDER BY l.id`, [entryId]).map(mapLine);
}

export function listLedgerLines(range: DateRange, accountId: number | null): (JournalLine & { entryDate: string; description: string })[] {
  const conditions = ['e.entry_date BETWEEN ? AND ?'];
  const params: SqlParam[] = [range.from, range.to];
  if (accountId !== null) {
    conditions.push('l.account_id = ?');
    params.push(accountId);
  }
  return queryRows(
    `SELECT l.id, l.journal_entry_id, l.account_id, l.debit_amount, l.credit_amount,
            a.code, a.name, a.type, e.entry_date, e.description
       FROM journal_entry_lines l
       JOIN journal_entries e ON e.id = l.journal_entry_id
       JOIN accounts a ON a.id = l.account_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.entry_date, e.id, l.id`,
    params,
  ).map((row) => ({
    ...mapLine(row),
    entryDate: String(row.entry_date),
    description: String(row.description),
  }));
}

export function insertJournalEntry(input: JournalEntryInsert): number {
  execute(
    'INSERT INTO journal_entries (entry_date, description, source_type, source_id, reversal_of_id) VALUES (?, ?, ?, ?, ?)',
    [
      input.entryDate,
      input.description,
      input.source?.sourceType ?? null,
      input.source?.sourceId ?? null,
      input.reversalOfId,
    ],
  );
  return lastInsertId();
}

export function insertJournalLine(entryId: number, line: JournalLineInsert): void {
  execute('INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount) VALUES (?, ?, ?, ?)', [
    entryId,
    line.accountId,
    line.debitAmount,
    line.creditAmount,
  ]);
}

export function sumLinesForEntry(entryId: number): { debit: number; credit: number } {
  const rows = queryRows(
    'SELECT COALESCE(SUM(debit_amount), 0) AS debit, COALESCE(SUM(credit_amount), 0) AS credit FROM journal_entry_lines WHERE journal_entry_id = ?',
    [entryId],
  );
  return { debit: Number(rows[0].debit), credit: Number(rows[0].credit) };
}

export function listActiveSourceEntryIds(source: JournalEntrySource): number[] {
  return queryRows(
    `SELECT e.id FROM journal_entries e
      WHERE e.source_type = ? AND e.source_id = ?
        AND NOT EXISTS (SELECT 1 FROM journal_entries r WHERE r.reversal_of_id = e.id)`,
    [source.sourceType, source.sourceId],
  ).map((row) => Number(row.id));
}

export function sumTotalsInRange(range: DateRange): AccountTotals[] {
  return queryRows(
    `SELECT l.account_id AS account_id,
            SUM(l.debit_amount) AS debit,
            SUM(l.credit_amount) AS credit
       FROM journal_entry_lines l
       JOIN journal_entries e ON e.id = l.journal_entry_id
      WHERE e.entry_date BETWEEN ? AND ?
      GROUP BY l.account_id`,
    [range.from, range.to],
  ).map((row) => ({ accountId: Number(row.account_id), debit: Number(row.debit), credit: Number(row.credit) }));
}

export function sumTotalsByPeriodAndAccount(range: DateRange): PeriodAccountTotals[] {
  return queryRows(
    `SELECT substr(e.entry_date, 1, 7) AS period,
            a.id AS account_id, a.code, a.name, a.type,
            SUM(l.debit_amount) AS debit,
            SUM(l.credit_amount) AS credit
       FROM journal_entry_lines l
       JOIN journal_entries e ON e.id = l.journal_entry_id
       JOIN accounts a ON a.id = l.account_id
      WHERE e.entry_date BETWEEN ? AND ?
      GROUP BY period, a.id
      ORDER BY period, a.code`,
    [range.from, range.to],
  ).map((row) => ({
    period: String(row.period),
    accountId: Number(row.account_id),
    accountCode: String(row.code),
    accountName: String(row.name),
    accountType: String(row.type) as AccountType,
    debit: Number(row.debit),
    credit: Number(row.credit),
  }));
}
