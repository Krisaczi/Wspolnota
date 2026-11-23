import { jsPDF } from 'jspdf';
import i18n from '../../i18n';
import autoTable from 'jspdf-autotable';
import { formatNumber } from '../../lib/money';
import { toast } from '../../stores/toastStore';
import type { ReportCell, ReportDocument } from './types';

const MARGIN = 14;
const FONT_NAME = 'DejaVuSansCondensed';

const FONT_FILES = [
  { style: 'normal', file: 'DejaVuSansCondensed.ttf' },
  { style: 'bold', file: 'DejaVuSansCondensed-Bold.ttf' },
] as const;

function formatCell(cell: ReportCell): string {
  return typeof cell === 'number' ? formatNumber(cell) : cell;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function registerUnicodeFonts(doc: jsPDF): Promise<void> {
  for (const { style, file } of FONT_FILES) {
    const response = await fetch(`${import.meta.env.BASE_URL}fonts/${file}`);
    if (!response.ok) throw new Error(`Font ${file} could not be loaded`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    doc.addFileToVFS(file, toBase64(bytes));
    doc.addFont(file, FONT_NAME, style);
  }
  doc.setFont(FONT_NAME, 'normal');
}

export async function exportReportPdf(report: ReportDocument): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registerUnicodeFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text(report.title, MARGIN, 22);
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(report.subtitle, MARGIN, 29);
  doc.text(i18n.t('reportDocument.generated', { date: report.generatedAt }), MARGIN, 34);
  doc.setTextColor(0);

  let cursorY = 42;
  autoTable(doc, {
    startY: cursorY,
    head: [[i18n.t('reportDocument.columns.summary'), i18n.t('reportDocument.columns.value')]],
    body: report.summary.map((item) => [item.label, item.value]),
    theme: 'striped',
    styles: { font: FONT_NAME },
    headStyles: { fillColor: [15, 118, 110], font: FONT_NAME, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: MARGIN, right: MARGIN },
  });
  cursorY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;

  for (const table of report.tables) {
    cursorY += 10;
    if (cursorY > 260) {
      doc.addPage();
      cursorY = MARGIN;
    }
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(12);
    doc.text(table.heading, MARGIN, cursorY);
    doc.setFont(FONT_NAME, 'normal');
    autoTable(doc, {
      startY: cursorY + 3,
      head: [table.columns],
      body: table.rows.map((row) => row.map(formatCell)),
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], font: FONT_NAME, fontStyle: 'bold' },
      styles: { fontSize: 9, font: FONT_NAME },
      margin: { left: MARGIN, right: MARGIN },
      didParseCell: (data) => {
        const isNumericColumn = typeof table.rows[0]?.[data.column.index] === 'number';
        if (isNumericColumn && data.section !== 'head') data.cell.styles.halign = 'right';
      },
    });
    cursorY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(i18n.t('reportDocument.page', { page, total: pageCount }), pageWidth - MARGIN, 290, { align: 'right' });
  }

  const output = doc.output('arraybuffer');
  const bytes = new Uint8Array(output);
  const { saveReport } = await import('./saveReport');
  const saved = await saveReport(`${report.fileName}.pdf`, 'pdf', 'PDF document', 'application/pdf', bytes);
  if (saved.canceled) return;
  toast.success(i18n.t('reportDocument.savedTo', { path: saved.path }));
}
