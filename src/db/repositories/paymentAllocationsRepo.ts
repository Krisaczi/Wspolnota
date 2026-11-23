import { execute, lastInsertId, queryRows, type Row } from '../client';
import type { ChargeCategory } from '../../domain/accounting/chargeCategories';

export interface PaymentAllocationRow {
  id: number;
  paymentId: number;
  chargeCategory: ChargeCategory;
  amount: number;
  note: string | null;
}

export interface PaymentAllocationInput {
  chargeCategory: ChargeCategory;
  amount: number;
  note: string | null;
}

function mapRow(row: Row): PaymentAllocationRow {
  return {
    id: Number(row.id),
    paymentId: Number(row.payment_id),
    chargeCategory: String(row.charge_category) as ChargeCategory,
    amount: Number(row.amount),
    note: row.note === null ? null : String(row.note),
  };
}

export function listAllocationsForPayment(paymentId: number): PaymentAllocationRow[] {
  return queryRows('SELECT * FROM payment_allocations WHERE payment_id = ? ORDER BY id', [paymentId]).map(mapRow);
}

export function listAllocationsForPayments(paymentIds: number[]): PaymentAllocationRow[] {
  if (paymentIds.length === 0) return [];
  const placeholders = paymentIds.map(() => '?').join(', ');
  return queryRows(
    `SELECT * FROM payment_allocations WHERE payment_id IN (${placeholders}) ORDER BY id`,
    paymentIds,
  ).map(mapRow);
}

export function insertPaymentAllocation(paymentId: number, input: PaymentAllocationInput): number {
  execute('INSERT INTO payment_allocations (payment_id, charge_category, amount, note) VALUES (?, ?, ?, ?)', [
    paymentId,
    input.chargeCategory,
    input.amount,
    input.note,
  ]);
  return lastInsertId();
}

export function deletePaymentAllocations(paymentId: number): void {
  execute('DELETE FROM payment_allocations WHERE payment_id = ?', [paymentId]);
}

/** Allocation totals per apartment for the given charge categories. */
export function allocationSumsByApartment(categories: ChargeCategory[], upToMonth?: string): Map<number, number> {
  const placeholders = categories.map(() => '?').join(', ');
  const rows = queryRows(
    `SELECT p.apartment_id AS apartment_id, SUM(pa.amount) AS total
       FROM payment_allocations pa
       JOIN payments p ON p.id = pa.payment_id
      WHERE pa.charge_category IN (${placeholders})${upToMonth ? ' AND substr(p.payment_date, 1, 7) <= ?' : ''}
      GROUP BY p.apartment_id`,
    upToMonth ? [...categories, upToMonth] : categories,
  );
  return new Map(rows.map((row) => [Number(row.apartment_id), Number(row.total)]));
}

/**
 * The portion of each payment that reduces the owner's outstanding balance:
 * settled operating/meter/maintenance/other categories plus the whole of any
 * unallocated (legacy) payment, whose automatic split settles receivables first.
 */
export function receivablePaymentsByApartment(upToMonth?: string): Map<number, number> {
  const rows = queryRows(
    `SELECT p.apartment_id AS apartment_id,
            SUM(CASE
              WHEN EXISTS (SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = p.id)
                THEN COALESCE((SELECT SUM(pa.amount) FROM payment_allocations pa WHERE pa.payment_id = p.id AND pa.charge_category != 'overpayment'), 0)
              ELSE p.amount
            END) AS total
       FROM payments p
      ${upToMonth ? 'WHERE substr(p.payment_date, 1, 7) <= ?' : ''}
      GROUP BY p.apartment_id`,
    upToMonth ? [upToMonth] : [],
  );
  return new Map(rows.map((row) => [Number(row.apartment_id), Number(row.total)]));
}
