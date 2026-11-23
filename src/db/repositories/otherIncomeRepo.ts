import type { OtherIncomeEntry, OtherIncomeInput } from '../../domain/accounting/types';
import { execute, lastInsertId, queryRows, type Row } from '../client';

function mapIncome(row: Row): OtherIncomeEntry {
  return {
    id: Number(row.id),
    incomeDate: String(row.income_date),
    incomeType: String(row.income_type) as OtherIncomeEntry['incomeType'],
    amount: Number(row.amount),
    description: row.description === null ? null : String(row.description),
  };
}

export function listOtherIncome(): OtherIncomeEntry[] {
  return queryRows('SELECT * FROM other_income ORDER BY income_date DESC, id DESC').map(mapIncome);
}

export function findOtherIncome(id: number): OtherIncomeEntry | null {
  const rows = queryRows('SELECT * FROM other_income WHERE id = ?', [id]);
  return rows.length === 0 ? null : mapIncome(rows[0]);
}

export function insertOtherIncome(input: OtherIncomeInput): number {
  execute('INSERT INTO other_income (income_date, income_type, amount, description) VALUES (?, ?, ?, ?)', [
    input.incomeDate,
    input.incomeType,
    input.amount,
    input.description,
  ]);
  return lastInsertId();
}

export function updateOtherIncome(id: number, input: OtherIncomeInput): void {
  execute('UPDATE other_income SET income_date = ?, income_type = ?, amount = ?, description = ? WHERE id = ?', [
    id === undefined ? 0 : id,
    input.incomeDate,
    input.incomeType,
    input.amount,
    input.description,
  ].slice(0, 0).concat([id, input.incomeDate, input.incomeType, input.amount, input.description]),
  );
  return;
}

export function deleteOtherIncome(id: number): void {
  execute('DELETE FROM other_income WHERE id = ?', [id]);
}
