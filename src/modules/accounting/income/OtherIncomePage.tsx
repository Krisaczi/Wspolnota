import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DataTable, type DataColumn } from '../../../components/ui/DataTable';
import { IconButton } from '../../../components/ui/IconButton';
import type { OtherIncomeEntry } from '../../../domain/accounting/types';
import { attempt } from '../../../lib/attempt';
import { formatMoney } from '../../../lib/money';
import { formatDate } from '../../../lib/periods';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useOtherIncomeStore } from '../../../stores/otherIncomeStore';
import { OtherIncomeForm } from './OtherIncomeForm';

export function OtherIncomePage() {
  const { t } = useTranslation();
  const entries = useOtherIncomeStore((state) => state.entries);
  const refresh = useOtherIncomeStore((state) => state.refresh);
  const save = useOtherIncomeStore((state) => state.save);
  const remove = useOtherIncomeStore((state) => state.remove);
  const currency = useSettingsStore((state) => state.settings.currency);
  const money = (value: number) => formatMoney(value, currency);

  const [creating, setCreating] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<OtherIncomeEntry | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const columns: DataColumn<OtherIncomeEntry>[] = [
    {
      key: 'date',
      header: t('fields.date'),
      sortValue: (row) => row.incomeDate,
      render: (row) => <span className="whitespace-nowrap">{formatDate(row.incomeDate)}</span>,
    },
    {
      key: 'type',
      header: t('accounting.otherIncome.columns.type'),
      sortValue: (row) => row.incomeType,
      render: (row) => (
        <Badge tone={row.incomeType === 'interest' ? 'info' : 'neutral'}>
          {t(`accounting.otherIncome.types.${row.incomeType}`)}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: t('fields.description'),
      sortValue: (row) => row.description ?? '',
      render: (row) => <span className="text-neutral-900 dark:text-neutral-100">{row.description ?? '—'}</span>,
    },
    {
      key: 'amount',
      header: t('fields.amount'),
      align: 'right',
      sortValue: (row) => row.amount,
      render: (row) => <span className="font-semibold tabular-nums">{money(row.amount)}</span>,
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
          {t('accounting.otherIncome.newEntry')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={entries}
        getRowKey={(row) => row.id}
        emptyMessage={t('accounting.otherIncome.empty')}
        initialSort={{ key: 'date', direction: 'desc' }}
        actions={(row) => (
          <div className="flex justify-end gap-1">
            <IconButton label={t('actions.delete')} tone="danger" onClick={() => setPendingRemove(row)}>
              <Trash2 size={16} />
            </IconButton>
          </div>
        )}
      />

      {creating ? (
        <OtherIncomeForm
          onSubmit={(values) => {
            if (attempt(() => save(values, null), t('accounting.otherIncome.saved')).ok) {
              setCreating(false);
              refresh();
            }
          }}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {pendingRemove ? (
        <ConfirmDialog
          title={t('accounting.otherIncome.deleteTitle')}
          message={t('accounting.otherIncome.deleteMessage', { date: formatDate(pendingRemove.incomeDate) })}
          confirmLabel={t('actions.delete')}
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => {
            const target = pendingRemove;
            setPendingRemove(null);
            if (attempt(() => remove(target.id), t('accounting.otherIncome.deleted')).ok) refresh();
          }}
        />
      ) : null}
    </>
  );
}
