import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/Modal';
import type { JournalEntry } from '../../../domain/accounting/types';
import { listLinesForEntry } from '../../../db/repositories/journalEntriesRepo';
import { accountDisplayName, accountTypeLabel } from '../../../lib/accountLabels';
import { formatDate } from '../../../lib/periods';
import { formatMoney } from '../../../lib/money';
import { useSettingsStore } from '../../../stores/settingsStore';

interface JournalEntryDetailsProps {
  entry: JournalEntry;
  onClose: () => void;
}

export function JournalEntryDetails({ entry, onClose }: JournalEntryDetailsProps) {
  const { t } = useTranslation();
  const currency = useSettingsStore((state) => state.settings.currency);
  const money = (value: number) => (value === 0 ? '' : formatMoney(value, currency));
  const lines = useMemo(() => listLinesForEntry(entry.id), [entry.id]);

  return (
    <Modal
      title={entry.description}
      description={t('accounting.journal.entryDateLabel', { date: formatDate(entry.entryDate) })}
      size="lg"
      onClose={onClose}
    >
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-400">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t('accounting.journal.columns.account')}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t('fields.type')}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t('accounting.journal.debit')}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t('accounting.journal.credit')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-2.5 text-neutral-900 dark:text-neutral-100">
                  <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{line.accountCode}</span>{' '}
                  {accountDisplayName({ code: line.accountCode, name: line.accountName })}
                </td>
                <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300">{accountTypeLabel(line.accountType)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-neutral-900 dark:text-neutral-100">{money(line.debitAmount)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-neutral-900 dark:text-neutral-100">{money(line.creditAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
