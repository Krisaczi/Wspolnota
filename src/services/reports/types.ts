export type ReportCell = string | number;

export interface ReportSummaryItem {
  label: string;
  value: string;
}

export interface ReportTable {
  heading: string;
  columns: string[];
  rows: ReportCell[][];
}

export interface ReportDocument {
  title: string;
  subtitle: string;
  generatedAt: string;
  fileName: string;
  summary: ReportSummaryItem[];
  tables: ReportTable[];
}
