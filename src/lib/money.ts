import { currentLocale } from '../i18n';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseAmountInput(value: string): number {
  const trimmed = value.trim().replace(/[\s\u00a0]/g, '').replace(',', '.');
  return trimmed === '' ? 0 : Number(trimmed);
}

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat(currentLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
