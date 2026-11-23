import * as XLSX from 'xlsx';
import i18n from '../../i18n';
import { toast } from '../../stores/toastStore';
import type { ReportDocument } from './types';

const MAX_SHEET_NAME = 31;

function uniqueSheetName(base: string, used: Set<string>): string {
  const cleaned = base.replace(/[[\]:*?/\\]/g, ' ').slice(0, MAX_SHEET_NAME);
  let name = cleaned;
  let suffix = 2;
  while (used.has(name)) {
    name = `${cleaned.slice(0, MAX_SHEET_NAME - 4)} (${suffix})`;
    suffix += 1;
  }
  used.add(name);
  return name;
}

export async function exportReportExcel(report: ReportDocument): Promise<void> {
  const book = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  const summaryRows: (string | number)[][] = [
    [report.title],
    [report.subtitle],
    [i18n.t('reportDocument.generated', { date: report.generatedAt })],
    [],
    [i18n.t('reportDocument.columns.summary'), i18n.t('reportDocument.columns.value')],
    ...report.summary.map((item) => [item.label, item.value]),
  ];
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet(summaryRows),
    uniqueSheetName(i18n.t('reportDocument.columns.summary'), usedNames),
  );

  for (const table of report.tables) {
    const rows = [table.columns, ...table.rows];
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet(rows),
      uniqueSheetName(table.heading, usedNames),
    );
  }

  const data = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const bytes = new Uint8Array(data);
  const { saveReport } = await import('./saveReport');
  const saved = await saveReport(`${report.fileName}.xlsx`, 'xlsx', 'Excel workbook', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes);
  if (saved.canceled) return;
  toast.success(i18n.t('reportDocument.savedTo', { path: saved.path }));
}
