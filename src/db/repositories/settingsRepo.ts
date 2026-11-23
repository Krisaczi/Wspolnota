import type { AppSettings } from '../../domain/types';
import { execute, queryRows } from '../client';

export const DEFAULT_SETTINGS: AppSettings = {
  communityName: 'Wspólnota Mieszkaniowa',
  currency: 'PLN',
};

export function readSettings(): AppSettings {
  const stored = new Map(queryRows('SELECT key, value FROM app_settings').map((row) => [String(row.key), String(row.value)]));
  return {
    communityName: stored.get('communityName') ?? DEFAULT_SETTINGS.communityName,
    currency: stored.get('currency') ?? DEFAULT_SETTINGS.currency,
  };
}

export function writeSettings(settings: AppSettings): void {
  for (const [key, value] of Object.entries(settings)) {
    execute('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
      key,
      value,
    ]);
  }
}
