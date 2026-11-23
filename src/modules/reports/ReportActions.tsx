import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { toFriendlyMessage } from '../../lib/errors';
import type { ReportDocument } from '../../services/reports/types';
import { toast } from '../../stores/toastStore';

async function exportReport(report: ReportDocument, format: 'pdf' | 'excel'): Promise<void> {
  try {
    if (format === 'pdf') {
      const { exportReportPdf } = await import('../../services/reports/exportPdf');
      await exportReportPdf(report);
    } else {
      const { exportReportExcel } = await import('../../services/reports/exportExcel');
      await exportReportExcel(report);
    }
  } catch (error) {
    toast.error(toFriendlyMessage(error));
  }
}

export function ReportActions({ report }: { report: ReportDocument }) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Button variant="secondary" icon={<Download size={16} />} onClick={() => void exportReport(report, 'pdf')}>
        {t('reportsPage.exportPdf')}
      </Button>
      <Button variant="secondary" icon={<FileSpreadsheet size={16} />} onClick={() => void exportReport(report, 'excel')}>
        {t('reportsPage.exportExcel')}
      </Button>
      <Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()}>
        {t('reportsPage.print')}
      </Button>
    </div>
  );
}
