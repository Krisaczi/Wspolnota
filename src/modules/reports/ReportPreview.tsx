import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../lib/money';
import type { ReportCell, ReportDocument } from '../../services/reports/types';

function renderCell(cell: ReportCell): string {
  return typeof cell === 'number' ? formatNumber(cell) : cell;
}

export function ReportPreview({ report }: { report: ReportDocument }) {
  const { t } = useTranslation();
  return (
    <article className="print-area rounded-xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-sm sm:p-8">
      <header className="border-b border-neutral-200 pb-4">
        <h2 className="text-xl font-semibold leading-tight text-neutral-900">{report.title}</h2>
        <p className="mt-1 text-sm text-neutral-600">{report.subtitle}</p>
        <p className="mt-1 text-xs text-neutral-500">{t('reportsPage.generatedAt', { date: report.generatedAt })}</p>
      </header>

      {report.summary.length > 0 ? (
        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {report.summary.map((item) => (
            <div key={item.label} className="rounded-lg bg-neutral-50 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">{item.label}</dt>
              <dd className="mt-1 text-base font-semibold tabular-nums text-neutral-900">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {report.tables.map((table) => (
        <section key={table.heading} className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-neutral-800">{table.heading}</h3>
          {table.rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
              {t('reportsPage.noEntries')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600">
                    {table.columns.map((column, index) => (
                      <th key={column} scope="col" className={`px-3 py-2 font-semibold ${index === table.columns.length - 1 ? 'text-right' : ''}`}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={`px-3 py-2 text-neutral-800 ${cellIndex === row.length - 1 ? 'text-right tabular-nums' : ''}`}
                        >
                          {renderCell(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </article>
  );
}
