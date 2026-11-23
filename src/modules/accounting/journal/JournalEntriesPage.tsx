import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Plus, Undo2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DataTable, type DataColumn } from '../../../components/ui/DataTable';
import { Field, TextInput } from '../../../components/ui/FormFields';
import { IconButton } from '../../../components/ui/IconButton';
import type { FieldErrors } from '../../../domain/validation/common';
import type { JournalEntry, JournalEntryInput } from '../../../domain/accounting/types';
import { attempt } from '../../../lib/attempt';
import { formatMoney } from '../../../lib/money';
import { formatDate, isValidDate } from '../../../lib/periods';
import { postJournalEntry, reverseJournalEntry } from '../../../services/accounting/accountingService';
import { useAccountingStore } from '../../../stores/accountingStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { toast } from '../../../stores/toastStore';
import { JournalEntryDetails } from './JournalEntryDetails';
import { JournalEntryForm } from './JournalEntryForm';

function EntryStatusBadge({ entry }: { entry: JournalEntry }) {
  const { t } = useTranslation();
  if (entry.reversed) return <Badge tone="neutral">{t('accounting.journal.status.reversed')}</Badge>;
  if (entry.reversalOfId !== null) return <Badge tone="info">{t('accounting.journal.status.reversal')}</Badge>;
  return <Badge tone="success">{t('accounting.journal.status.posted')}</Badge>;
}

function reverseBlockKey(entry: JournalEntry): string | null {
  if (entry.reversed) return 'accounting.journal.blocked.alreadyReversed';
  if (entry.reversalOfId !== null) return 'accounting.journal.blocked.reversalEntry';
  if (entry.sourceType !== null) return 'accounting.journal.blocked.paymentEntry';
  return null;
}

function entryStatusRank(entry: JournalEntry): number {
  if (entry.reversed) return 0;
  return entry.reversalOfId !== null ? 1 : 2;
}

export function JournalEntriesPage() {
  const { t } = useTranslation();
  const summaries = useAccountingStore((state) => state.summaries);
  const entries = useAccountingStore((state) => state.entries);
  const entriesRange = useAccountingStore((state) => state.entriesRange);
  const setEntriesRange = useAccountingStore((state) => state.setEntriesRange);
  const refresh = useAccountingStore((state) => state.refresh);
  const currency = useSettingsStore((state) => state.settings.currency);
  const money = (value: number) => formatMoney(value, currency);

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<JournalEntry | null>(null);
  const [pendingReverse, setPendingReverse] = useState<JournalEntry | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeAccounts = summaries.map((summary) => summary.account).filter((account) => account.active);

  const columns: DataColumn<JournalEntry>[] = [
    {
      key: 'date',
      header: t('fields.date'),
      sortValue: (row) => row.entryDate,
      render: (row) => <span className="whitespace-nowrap">{formatDate(row.entryDate)}</span>,
    },
    {
      key: 'description',
      header: t('fields.description'),
      sortValue: (row) => row.description,
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="text-neutral-900 dark:text-neutral-100">{row.description}</span>
          {row.sourceType === 'payment' ? <Badge tone="info">{t('accounting.journal.status.payment')}</Badge> : null}
        </span>
      ),
    },
    {
      key: 'amount',
      header: t('fields.amount'),
      align: 'right',
      sortValue: (row) => row.totalAmount,
      render: (row) => <span className="font-semibold">{money(row.totalAmount)}</span>,
    },
    {
      key: 'status',
      header: t('accounting.journal.columns.status'),
      sortValue: entryStatusRank,
      render: (row) => <EntryStatusBadge entry={row} />,
    },
  ];

  const handleSave = (values: JournalEntryInput): FieldErrors | null => {
    const outcome = attempt(() => postJournalEntry(values));
    if (!outcome.ok) return { form: t('accounting.journal.saveFailed') };
    if (!outcome.value.ok) return outcome.value.errors;
    toast.success(t('accounting.journal.posted'));
    setCreating(false);
    refresh();
    return null;
  };

  const runReverse = () => {
    if (!pendingReverse) return;
    const target = pendingReverse;
    setPendingReverse(null);
    if (attempt(() => reverseJournalEntry(target.id), t('accounting.journal.reversed')).ok) refresh();
  };

  const updateRange = (patch: Partial<typeof entriesRange>) => {
    const next = { ...entriesRange, ...patch };
    if (isValidDate(next.from) && isValidDate(next.to) && next.from <= next.to) setEntriesRange(next);
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid grid-cols-2 gap-3 sm:w-80">
          <Field label={t('accounting.journal.from')} htmlFor="journalFrom">
            <TextInput id="journalFrom" type="date" value={entriesRange.from} onChange={(event) => updateRange({ from: event.target.value })} />
          </Field>
          <Field label={t('accounting.journal.to')} htmlFor="journalTo">
            <TextInput id="journalTo" type="date" value={entriesRange.to} onChange={(event) => updateRange({ to: event.target.value })} />
          </Field>
        </div>
        <Button className="sm:ml-auto" icon={<Plus size={16} />} onClick={() => setCreating(true)} disabled={activeAccounts.length < 2}>
          {t('accounting.journal.newEntry')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={entries}
        getRowKey={(row) => row.id}
        emptyMessage={t('accounting.journal.empty')}
        initialSort={{ key: 'date', direction: 'desc' }}
        actions={(row) => {
          const blockedKey = reverseBlockKey(row);
          return (
            <div className="flex justify-end gap-1">
              <IconButton label={t('accounting.journal.viewLines')} onClick={() => setViewing(row)}>
                <Eye size={16} />
              </IconButton>
              <IconButton
                label={blockedKey ? t(blockedKey) : t('accounting.journal.reverseEntry')}
                disabled={blockedKey !== null}
                onClick={() => setPendingReverse(row)}
              >
                <Undo2 size={16} />
              </IconButton>
            </div>
          );
        }}
      />

      {creating ? (
        <JournalEntryForm accounts={activeAccounts} onClose={() => setCreating(false)} onSubmit={handleSave} />
      ) : null}

      {viewing ? <JournalEntryDetails entry={viewing} onClose={() => setViewing(null)} /> : null}

      {pendingReverse ? (
        <ConfirmDialog
          title={t('accounting.journal.reverseTitle')}
          message={t('accounting.journal.reverseMessage', { description: pendingReverse.description })}
          confirmLabel={t('accounting.journal.reverse')}
          onCancel={() => setPendingReverse(null)}
          onConfirm={runReverse}
        />
      ) : null}
    </>
  );
}
