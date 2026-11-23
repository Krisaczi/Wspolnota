import { currentLocale } from '../../i18n';
import { readSettings } from '../../db/repositories/settingsRepo';
import { formatMoney } from '../../lib/money';

export interface ReportContext {
  currency: string;
  communityName: string;
  generatedAt: string;
}

export function createReportContext(): ReportContext {
  const settings = readSettings();
  return {
    currency: settings.currency,
    communityName: settings.communityName,
    generatedAt: new Date().toLocaleString(currentLocale()),
  };
}

export function money(value: number, context: ReportContext): string {
  return formatMoney(value, context.currency);
}
