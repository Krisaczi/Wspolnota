import type { ChargeView, MonthlyCharge } from '../../domain/types';
import { execute, queryRows, type Row, type SqlParam } from '../client';

export interface NewMonthlyCharge {
  apartmentId: number;
  chargeTypeId: number;
  billingPeriod: string;
  amount: number;
}

function mapCharge(row: Row): MonthlyCharge {
  return {
    id: Number(row.id),
    apartmentId: Number(row.apartment_id),
    chargeTypeId: Number(row.charge_type_id),
    billingPeriod: String(row.billing_period),
    amount: Number(row.amount),
  };
}

function mapChargeView(row: Row): ChargeView {
  return {
    ...mapCharge(row),
    apartmentNumber: String(row.apartment_number),
    chargeTypeName: String(row.charge_type_name),
  };
}

export function listChargesForPeriod(period: string): ChargeView[] {
  return queryRows(
    `SELECT mc.*, a.apartment_number, ct.name AS charge_type_name
       FROM monthly_charges mc
       JOIN apartments a ON a.id = mc.apartment_id
       JOIN charge_types ct ON ct.id = mc.charge_type_id
      WHERE mc.billing_period = ?
      ORDER BY a.apartment_number COLLATE NOCASE, ct.name COLLATE NOCASE`,
    [period],
  ).map(mapChargeView);
}

export function listChargesForPeriodAndApartment(period: string, apartmentId: number): MonthlyCharge[] {
  return queryRows('SELECT * FROM monthly_charges WHERE billing_period = ? AND apartment_id = ?', [
    period,
    apartmentId,
  ]).map(mapCharge);
}

export function listChargesInRange(fromPeriod: string, toPeriod: string, apartmentId?: number): ChargeView[] {
  const params: SqlParam[] = [fromPeriod, toPeriod];
  let filter = '';
  if (apartmentId !== undefined) {
    filter = 'AND mc.apartment_id = ?';
    params.push(apartmentId);
  }
  return queryRows(
    `SELECT mc.*, a.apartment_number, ct.name AS charge_type_name
       FROM monthly_charges mc
       JOIN apartments a ON a.id = mc.apartment_id
       JOIN charge_types ct ON ct.id = mc.charge_type_id
      WHERE mc.billing_period BETWEEN ? AND ? ${filter}
      ORDER BY mc.billing_period, a.apartment_number COLLATE NOCASE, ct.name COLLATE NOCASE`,
    params,
  ).map(mapChargeView);
}

export function insertMonthlyCharge(charge: NewMonthlyCharge): void {
  execute(
    'INSERT INTO monthly_charges (apartment_id, charge_type_id, billing_period, amount) VALUES (?, ?, ?, ?)',
    [charge.apartmentId, charge.chargeTypeId, charge.billingPeriod, charge.amount],
  );
}

export function deleteChargesForPeriod(period: string): number {
  return execute('DELETE FROM monthly_charges WHERE billing_period = ?', [period]);
}

export function sumChargesByApartment(upToPeriod?: string): Map<number, number> {
  const rows = upToPeriod
    ? queryRows(
        'SELECT apartment_id, SUM(amount) AS total FROM monthly_charges WHERE billing_period <= ? GROUP BY apartment_id',
        [upToPeriod],
      )
    : queryRows('SELECT apartment_id, SUM(amount) AS total FROM monthly_charges GROUP BY apartment_id');
  return new Map(rows.map((row) => [Number(row.apartment_id), Number(row.total)]));
}
