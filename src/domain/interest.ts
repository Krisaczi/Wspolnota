import type { InterestRate, InterestResult } from './types';
import { roundMoney } from '../lib/money';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365;

function utcDate(date: string): number {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * Simple interest for one rate entry: principal x annual rate x days / 365.
 * Days run from the counting start date (inclusive) to today (exclusive).
 */
export function calculateInterestForRate(
  principal: number,
  rate: InterestRate,
  asOfDate: string,
): InterestResult {
  const startMs = utcDate(rate.countingStartDate);
  const endMs = utcDate(asOfDate);
  const days = Math.max(0, Math.floor((endMs - startMs) / MS_PER_DAY));
  const interest = days > 0 ? (principal * rate.annualRate * days) / (100 * DAYS_PER_YEAR) : 0;
  return {
    period: rate.billingPeriod,
    rate: rate.annualRate,
    countingStartDate: rate.countingStartDate,
    days,
    interest: roundMoney(interest),
  };
}

/** Total interest across all rate entries for one outstanding balance. */
export function calculateTotalInterest(
  principal: number,
  rates: InterestRate[],
  asOfDate: string,
): number {
  return roundMoney(
    rates.reduce((sum, rate) => sum + calculateInterestForRate(principal, rate, asOfDate).interest, 0),
  );
}

/** Interest broken down per rate entry, highest first. */
export function calculateInterestBreakdown(
  principal: number,
  rates: InterestRate[],
  asOfDate: string,
): InterestResult[] {
  return rates
    .map((rate) => calculateInterestForRate(principal, rate, asOfDate))
    .sort((a, b) => b.interest - a.interest);
}
