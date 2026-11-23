import { roundMoney } from '../../lib/money';
import type { AccountType } from './types';

export const DEBIT_NORMAL_TYPES: readonly AccountType[] = ['ASSET', 'EXPENSE'];

export function isDebitNormal(type: AccountType): boolean {
  return DEBIT_NORMAL_TYPES.includes(type);
}

export function balanceOf(type: AccountType, debit: number, credit: number): number {
  return roundMoney(isDebitNormal(type) ? debit - credit : credit - debit);
}
