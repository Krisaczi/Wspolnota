import type { MeterReading, MeterType, ReadingView } from '../../domain/types';
import { execute, queryRows, lastInsertId, type Row } from '../client';
import { roundMoney } from '../../lib/money';

export interface MeterReadingInput {
  apartmentId: number;
  meterTypeId: number;
  readingDate: string;
  readingValue: number;
  rate: number | null;
  advanceMonths: number;
  advanceMonthlyAmount: number;
}

function mapMeterType(row: Row): MeterType {
  return { id: Number(row.id), name: String(row.name) };
}

function mapReading(row: Row): MeterReading {
  return {
    id: Number(row.id),
    apartmentId: Number(row.apartment_id),
    meterTypeId: Number(row.meter_type_id),
    readingDate: String(row.reading_date),
    readingValue: Number(row.reading_value),
    rate: row.rate === null || row.rate === undefined ? null : Number(row.rate),
    advanceMonths: row.advance_months === null || row.advance_months === undefined ? 0 : Number(row.advance_months),
    advanceMonthlyAmount:
      row.advance_monthly_amount === null || row.advance_monthly_amount === undefined
        ? 0
        : Number(row.advance_monthly_amount),
  };
}

function mapReadingView(row: Row): ReadingView {
  return {
    ...mapReading(row),
    apartmentNumber: String(row.apartment_number),
    meterTypeName: String(row.meter_type_name),
  };
}

export function listMeterTypes(): MeterType[] {
  return queryRows('SELECT * FROM meter_types ORDER BY name COLLATE NOCASE').map(mapMeterType);
}

export function insertMeterType(name: string): void {
  execute('INSERT INTO meter_types (name) VALUES (?)', [name]);
}

export function updateMeterType(id: number, name: string): void {
  execute('UPDATE meter_types SET name = ? WHERE id = ?', [name, id]);
}

export function deleteMeterType(id: number): void {
  execute('DELETE FROM meter_types WHERE id = ?', [id]);
}

export function listReadings(apartmentId: number, meterTypeId: number): ReadingView[] {
  return queryRows(
    `SELECT mr.*, a.apartment_number, mt.name AS meter_type_name
       FROM meter_readings mr
       JOIN apartments a ON a.id = mr.apartment_id
       JOIN meter_types mt ON mt.id = mr.meter_type_id
      WHERE mr.apartment_id = ? AND mr.meter_type_id = ?
      ORDER BY mr.reading_date ASC, mr.id ASC`,
    [apartmentId, meterTypeId],
  ).map(mapReadingView);
}

export function insertReading(input: MeterReadingInput): number {
  execute(
    `INSERT INTO meter_readings (apartment_id, meter_type_id, reading_date, reading_value, rate, advance_months, advance_monthly_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.apartmentId, input.meterTypeId, input.readingDate, input.readingValue, input.rate, input.advanceMonths, input.advanceMonthlyAmount],
  );
  return lastInsertId();
}

export function updateReading(id: number, input: MeterReadingInput): void {
  execute(
    `UPDATE meter_readings
        SET apartment_id = ?, meter_type_id = ?, reading_date = ?, reading_value = ?, rate = ?, advance_months = ?, advance_monthly_amount = ?
      WHERE id = ?`,
    [input.apartmentId, input.meterTypeId, input.readingDate, input.readingValue, input.rate, input.advanceMonths, input.advanceMonthlyAmount, id],
  );
}

export function deleteReading(id: number): void {
  execute('DELETE FROM meter_readings WHERE id = ?', [id]);
}

export interface MeterAmountLine {
  meterTypeId: number;
  meterTypeName: string;
  amount: number;
}

export function meterAmountLinesByApartment(): Map<number, MeterAmountLine[]> {
  const rows = queryRows(
    `SELECT mr.apartment_id, mr.meter_type_id, mt.name AS meter_type_name, mr.reading_date, mr.reading_value, mr.rate, mr.advance_months, mr.advance_monthly_amount
       FROM meter_readings mr
       JOIN meter_types mt ON mt.id = mr.meter_type_id
      ORDER BY mr.apartment_id, mr.meter_type_id, mr.reading_date, mr.id`,
  );
  const perApartment = new Map<number, Map<number, MeterAmountLine>>();
  let prevApartment = NaN;
  let prevMeter = NaN;
  let prevValue = 0;
  for (const row of rows) {
    const apartmentId = Number(row.apartment_id);
    const meterTypeId = Number(row.meter_type_id);
    const value = Number(row.reading_value);
    const rate = row.rate === null || row.rate === undefined ? null : Number(row.rate);
    const advances = Number(row.advance_months ?? 0) * Number(row.advance_monthly_amount ?? 0);
    let byMeter = perApartment.get(apartmentId);
    if (byMeter === undefined) {
      byMeter = new Map<number, MeterAmountLine>();
      perApartment.set(apartmentId, byMeter);
    }
    let line = byMeter.get(meterTypeId);
    if (line === undefined) {
      line = { meterTypeId, meterTypeName: String(row.meter_type_name), amount: 0 };
      byMeter.set(meterTypeId, line);
    }
    line.amount = roundMoney(line.amount - roundMoney(advances));
    if (apartmentId === prevApartment && meterTypeId === prevMeter && rate !== null) {
      line.amount = roundMoney(line.amount + roundMoney((value - prevValue) * rate));
    }
    prevApartment = apartmentId;
    prevMeter = meterTypeId;
    prevValue = value;
  }
  const result = new Map<number, MeterAmountLine[]>();
  for (const [apartmentId, byMeter] of perApartment) {
    result.set(apartmentId, [...byMeter.values()].filter((line) => line.amount !== 0));
  }
  return result;
}

export function meterBalancesByApartment(): Map<number, number> {
  const lines = meterAmountLinesByApartment();
  const balances = new Map<number, number>();
  for (const [apartmentId, apartmentLines] of lines) {
    balances.set(apartmentId, roundMoney(apartmentLines.reduce((sum, line) => sum + line.amount, 0)));
  }
  return balances;
}

export interface ApartmentMeterSummary {
  apartmentId: number;
  meterTypeId: number;
  meterTypeName: string;
  readingDate: string;
  readingValue: number;
  consumption: number | null;
}

export function listLatestReadingSummaries(): ApartmentMeterSummary[] {
  const rows = queryRows(
    `SELECT mr.apartment_id, mr.meter_type_id, mt.name AS meter_type_name, mr.reading_date, mr.reading_value
       FROM meter_readings mr
       JOIN meter_types mt ON mt.id = mr.meter_type_id
      ORDER BY mr.apartment_id, mr.meter_type_id, mr.reading_date, mr.id`,
  );
  const summaries: ApartmentMeterSummary[] = [];
  for (const row of rows) {
    const apartmentId = Number(row.apartment_id);
    const meterTypeId = Number(row.meter_type_id);
    const value = Number(row.reading_value);
    const last = summaries[summaries.length - 1];
    if (last !== undefined && last.apartmentId === apartmentId && last.meterTypeId === meterTypeId) {
      last.consumption = roundMoney(value - last.readingValue);
      last.readingDate = String(row.reading_date);
      last.readingValue = value;
    } else {
      summaries.push({
        apartmentId,
        meterTypeId,
        meterTypeName: String(row.meter_type_name),
        readingDate: String(row.reading_date),
        readingValue: value,
        consumption: null,
      });
    }
  }
  return summaries;
}
