import type { MeterReading } from './types';
import { roundMoney } from '../lib/money';

export interface ReadingWithConsumption<T extends MeterReading> {
  reading: T;
  consumption: number | null;
}

/** Expects readings sorted by date ascending. */
export function withConsumption<T extends MeterReading>(readings: T[]): ReadingWithConsumption<T>[] {
  return readings.map((reading, index) => {
    const previous = readings[index - 1];
    return {
      reading,
      consumption: previous ? roundMoney(reading.readingValue - previous.readingValue) : null,
    };
  });
}

export function consumptionBetween(from: MeterReading, to: MeterReading): number {
  return roundMoney(to.readingValue - from.readingValue);
}
