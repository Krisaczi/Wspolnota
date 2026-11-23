import type { Account, AccountInput, AccountType } from '../../domain/accounting/types';
import { execute, lastInsertId, queryRows, type Row } from '../client';

const ACCOUNT_SELECT = `
  SELECT a.id, a.code, a.name, a.type, a.active, a.system_account, a.opening_balance, a.opening_balance_date, a.created_at,
         EXISTS (SELECT 1 FROM journal_entry_lines l WHERE l.account_id = a.id) AS has_transactions
    FROM accounts a`;

function mapAccount(row: Row): Account {
  return {
    id: Number(row.id),
    code: String(row.code),
    name: String(row.name),
    type: String(row.type) as AccountType,
    active: Number(row.active) === 1,
    systemAccount: Number(row.system_account) === 1,
    openingBalance: Number(row.opening_balance ?? 0),
    openingBalanceDate: row.opening_balance_date === null || row.opening_balance_date === undefined ? null : String(row.opening_balance_date),
    createdAt: String(row.created_at),
    hasTransactions: Number(row.has_transactions) === 1,
  };
}

export function listAccounts(): Account[] {
  return queryRows(`${ACCOUNT_SELECT} ORDER BY a.code`).map(mapAccount);
}

export function findAccount(id: number): Account | null {
  const rows = queryRows(`${ACCOUNT_SELECT} WHERE a.id = ?`, [id]);
  return rows.length === 0 ? null : mapAccount(rows[0]);
}

export function findAccountByCode(code: string): Account | null {
  const rows = queryRows(`${ACCOUNT_SELECT} WHERE a.code = ?`, [code]);
  return rows.length === 0 ? null : mapAccount(rows[0]);
}

export function listTakenCodes(excludeId: number | null): Set<string> {
  const rows = queryRows('SELECT code FROM accounts WHERE id IS NOT ?', [excludeId]);
  return new Set(rows.map((row) => String(row.code)));
}

export function insertAccount(input: AccountInput): number {
  execute('INSERT INTO accounts (code, name, type, system_account, opening_balance, opening_balance_date) VALUES (?, ?, ?, 0, ?, ?)', [
    input.code,
    input.name,
    input.type,
    input.openingBalance,
    input.openingBalanceDate,
  ]);
  return lastInsertId();
}

export function updateAccount(id: number, input: AccountInput): void {
  execute('UPDATE accounts SET code = ?, name = ?, type = ?, opening_balance = ?, opening_balance_date = ? WHERE id = ?', [
    input.code,
    input.name,
    input.type,
    input.openingBalance,
    input.openingBalanceDate,
    id,
  ]);
}

export function setAccountActive(id: number, active: boolean): void {
  execute('UPDATE accounts SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
}

export function deleteAccount(id: number): void {
  execute('DELETE FROM accounts WHERE id = ? AND system_account = 0', [id]);
}
