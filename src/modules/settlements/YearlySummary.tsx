import { useTranslation } from 'react-i18next';
import type { ReadingView } from '../../domain/types';
import { formatMoney, formatNumber } from '../../lib/money';
import { formatDate } from '../../lib/periods';
import { useSettingsStore } from '../../stores/settingsStore';

interface ConsumptionCalculatorProps {
  readings: ReadingView[];
}

interface YearGroup {
  year: string;
  rows: YearRow[];
  totalConsumption: number;
  totalAmount: number;
  totalAdvances: number;
  hasMissingRate: boolean;
}

interface YearRow {
  reading: ReadingView;
  consumption: number | null;
  amount: number | null;
}

function groupByYear(readings: ReadingView[]): YearGroup[] {
  const groups = new Map<string, YearRow[]>();
  readings.forEach((reading, index) => {
    const year = reading.readingDate.slice(0, 4);
    const previous = index > 0 ? readings[index - 1] : null;
    const consumption = previous === null ? null : reading.readingValue - previous.readingValue;
    const amount = consumption !== null && reading.rate !== null ? consumption * reading.rate : null;
    const list = groups.get(year);
    const row: YearRow = { reading, consumption, amount };
    if (list === undefined) groups.set(year, [row]);
    else list.push(row);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([year, rows]) => ({
      year,
      rows,
      totalConsumption: rows.reduce((sum, row) => sum + (row.consumption ?? 0), 0),
      totalAmount: rows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
      totalAdvances: rows.reduce((sum, row) => sum + row.reading.advanceMonths * row.reading.advanceMonthlyAmount, 0),
      hasMissingRate: rows.some((row) => row.consumption !== null && row.amount === null),
    }));
}

export function YearlySummary({ readings }: ConsumptionCalculatorProps) {
  const { t } = useTranslation();
  const currency = useSettingsStore((state) => state.settings.currency);

  if (readings.length < 2) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('settlements.consumption.needTwo')}</p>;
  }

  const years = groupByYear(readings);

  return (
    <div className="space-y-4">
      {years.map((group) => (
        <div
          key={group.year}
          className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/50">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{group.year}</h3>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-primary-900 dark:text-primary-100">
                {formatMoney(group.totalAmount - group.totalAdvances, currency)}
              </p>
              {group.totalAdvances > 0 ? (
                <p className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                  {t('settlements.consumption.afterAdvances', {
                    total: formatMoney(group.totalAmount, currency),
                    advances: formatMoney(group.totalAdvances, currency),
                  })}
                </p>
              ) : null}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-2 font-medium">{t('settlements.consumption.dateColumn')}</th>
                <th className="px-4 py-2 text-right font-medium">{t('settlements.consumption.consumptionColumn')}</th>
                <th className="px-4 py-2 text-right font-medium">{t('settlements.form.rate')}</th>
                <th className="px-4 py-2 text-right font-medium">{t('settlements.consumption.amountColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.filter((row) => row.reading.advanceMonths > 0 && row.reading.advanceMonthlyAmount > 0).length > 0 ? (
                <tr className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300" colSpan={3}>
                    {t('settlements.consumption.advancesRow')}
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                    −{formatMoney(group.totalAdvances, currency)}
                  </td>
                </tr>
              ) : null}
              {group.rows.map((row) => (
                <tr
                  key={row.reading.id}
                  className="border-t border-neutral-100 dark:border-neutral-800"
                >
                  <td className="px-4 py-2 text-neutral-900 dark:text-neutral-100">
                    {formatDate(row.reading.readingDate)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-neutral-900 dark:text-neutral-100">
                    {row.consumption === null ? (
                      <span className="text-neutral-400 dark:text-neutral-500">
                        {t('settlements.consumption.firstReading')}
                      </span>
                    ) : (
                      formatNumber(row.consumption)
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
                    {row.reading.rate === null ? '—' : formatNumber(row.reading.rate)}
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                    {row.amount === null ? '—' : formatMoney(row.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400">
                  {t('settlements.consumption.total')}
                </td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {formatNumber(group.totalConsumption)}
                </td>
                <td />
                <td className="px-4 py-2 text-right font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                  {formatMoney(group.totalAmount - group.totalAdvances, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
          {group.hasMissingRate ? (
            <p className="border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              {t('settlements.consumption.noRate')}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
