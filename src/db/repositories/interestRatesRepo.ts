import type { InterestRate } from '../../domain/types';
import { execute, queryRows, lastInsertId, type Row } from '../client';

export interface InterestRateInput {
  apartmentId: number;
  billingPeriod: string;
  annualRate: number;
  countingStartDate: string;
}

function mapRow(row: Row): InterestRate {
  return {
    id: Number(row.id),
    apartmentId: Number(row.apartment_id),
    billingPeriod: String(row.billing_period),
    annualRate: Number(row.annual_rate),
    countingStartDate: String(row.counting_start_date),
  };
}

export function listInterestRates(apartmentId: number): InterestRate[] {
  return queryRows(
    'SELECT * FROM interest_rates WHERE apartment_id = ? ORDER BY billing_period DESC, id DESC',
    [apartmentId],
  ).map(mapRow);
}

export function insertInterestRate(input: InterestRateInput): number {
  execute(
    'INSERT INTO interest_rates (apartment_id, billing_period, annual_rate, counting_start_date) VALUES (?, ?, ?, ?)',
    [input.apartmentId, input.billingPeriod, input.annualRate, input.countingStartDate],
  );
  return lastInsertId();
}

export function updateInterestRate(id: number, input: InterestRateInput): void {
  execute(
    'UPDATE interest_rates SET billing_period = ?, annual_rate = ?, counting_start_date = ? WHERE id = ?',
    [input.billingPeriod, input.annualRate, input.countingStartDate, id],
  );
}

export function deleteInterestRate(id: number): void {
  execute('DELETE FROM interest_rates WHERE id = ?', [id]);
}
