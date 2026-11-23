import type { Payment, PaymentView } from '../../domain/types';
import { execute, queryRows, lastInsertId, type Row, type SqlParam } from '../client';

export interface PaymentInput {
  apartmentId: number;
  paymentDate: string;
  amount: number;
  description: string | null;
}

function mapPayment(row: Row): Payment {
  return {
    id: Number(row.id),
    apartmentId: Number(row.apartment_id),
    paymentDate: String(row.payment_date),
    amount: Number(row.amount),
    description: row.description === null ? null : String(row.description),
  };
}

function mapPaymentView(row: Row): PaymentView {
  return { ...mapPayment(row), apartmentNumber: String(row.apartment_number) };
}

export function listPayments(filter: { apartmentId?: number; fromMonth?: string; toMonth?: string } = {}): PaymentView[] {
  const conditions: string[] = [];
  const params: SqlParam[] = [];
  if (filter.apartmentId !== undefined) {
    conditions.push('p.apartment_id = ?');
    params.push(filter.apartmentId);
  }
  if (filter.fromMonth !== undefined && filter.toMonth !== undefined) {
    conditions.push('substr(p.payment_date, 1, 7) BETWEEN ? AND ?');
    params.push(filter.fromMonth, filter.toMonth);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return queryRows(
    `SELECT p.*, a.apartment_number
       FROM payments p
       JOIN apartments a ON a.id = p.apartment_id
       ${where}
      ORDER BY p.payment_date DESC, p.id DESC`,
    params,
  ).map(mapPaymentView);
}

export function insertPayment(input: PaymentInput): number {
  execute('INSERT INTO payments (apartment_id, payment_date, amount, description) VALUES (?, ?, ?, ?)', [
    input.apartmentId,
    input.paymentDate,
    input.amount,
    input.description,
  ]);
  return lastInsertId();
}

export function updatePayment(id: number, input: PaymentInput): void {
  execute('UPDATE payments SET apartment_id = ?, payment_date = ?, amount = ?, description = ? WHERE id = ?', [
    input.apartmentId,
    input.paymentDate,
    input.amount,
    input.description,
    id,
  ]);
}

export function deletePayment(id: number): void {
  execute('DELETE FROM payments WHERE id = ?', [id]);
}

export function sumPaymentsByApartment(upToMonth?: string): Map<number, number> {
  const rows = upToMonth
    ? queryRows(
        'SELECT apartment_id, SUM(amount) AS total FROM payments WHERE substr(payment_date, 1, 7) <= ? GROUP BY apartment_id',
        [upToMonth],
      )
    : queryRows('SELECT apartment_id, SUM(amount) AS total FROM payments GROUP BY apartment_id');
  return new Map(rows.map((row) => [Number(row.apartment_id), Number(row.total)]));
}
