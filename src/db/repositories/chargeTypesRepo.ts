import type { CalculationMethod, ChargeType } from '../../domain/types';
import { execute, queryRows, lastInsertId, type Row } from '../client';

export interface ChargeTypeInput {
  name: string;
  calculationMethod: CalculationMethod;
  rate: number;
  active: boolean;
}

function mapChargeType(row: Row): ChargeType {
  return {
    id: Number(row.id),
    name: String(row.name),
    calculationMethod: String(row.calculation_method) as CalculationMethod,
    rate: Number(row.rate),
    active: Number(row.active) === 1,
  };
}

export function listChargeTypes(): ChargeType[] {
  return queryRows('SELECT * FROM charge_types ORDER BY name COLLATE NOCASE').map(mapChargeType);
}

export function insertChargeType(input: ChargeTypeInput): number {
  execute('INSERT INTO charge_types (name, calculation_method, rate, active) VALUES (?, ?, ?, ?)', [
    input.name,
    input.calculationMethod,
    input.rate,
    input.active ? 1 : 0,
  ]);
  return lastInsertId();
}

export function updateChargeType(id: number, input: ChargeTypeInput): void {
  execute('UPDATE charge_types SET name = ?, calculation_method = ?, rate = ?, active = ? WHERE id = ?', [
    input.name,
    input.calculationMethod,
    input.rate,
    input.active ? 1 : 0,
    id,
  ]);
}

export function deleteChargeType(id: number): void {
  execute('DELETE FROM charge_types WHERE id = ?', [id]);
}
