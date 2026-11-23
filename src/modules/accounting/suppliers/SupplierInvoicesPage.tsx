import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Banknote, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DataTable, type DataColumn } from '../../../components/ui/DataTable';
import { IconButton } from '../../../components/ui/IconButton';
import type { SupplierInvoice } from '../../../domain/accounting/types';
import { attempt } from '../../../lib/attempt';
import { formatMoney } from '../../../lib/money';
import { formatDate, todayIso } from '../../../lib/periods';
import { useAccountingStore } from '../../../stores/accountingStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useSupplierInvoicesStore } from '../../../stores/supplierInvoicesStore';
import { SupplierInvoiceForm } from './SupplierInvoiceForm';

export function SupplierInvoicesPage() {
  const { t } = useTranslation();
  const invoices = useSupplierInvoicesStore((state) => state.invoices);
  const balances = useSupplierInvoicesStore((state) => state.balances);
  const refresh = useSupplierInvoicesStore((state) => state.refresh);
  const save = useSupplierInvoicesStore((state) => state.save);
  const markPaid = useSupplierInvoicesStore((state) => state.markPaid);
  const markUnpaid = useSupplierInvoicesStore((state) => state.markUnpaid);
  const remove = useSupplierInvoicesStore((state) => state.remove);
  const summaries = useAccountingStore((state) => state.summaries);
  const currency = useSettingsStore((state) => state.settings.currency);
  const money = (value: number) => formatMoney(value, currency);

  const [creating, setCreating] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<SupplierInvoice | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const expenseAccounts = summaries
    .map((summary) => summary.account)
    .filter((account) => account.active && account.code.startsWith('4'));

  const openPayables = balances.filter((entry) => entry.balance > 0.005);

  const columns: DataColumn<SupplierInvoice>[] = [
    {
      key: 'date',
      header: t('accounting.suppliers.columns.invoiceDate'),
      sortValue: (row) => row.invoiceDate,
      render: (row) => <span className="whitespace-nowrap">{formatDate(row.invoiceDate)}</span>,
    },
    {
      key: 'supplier',
      header: t('accounting.suppliers.columns.supplier'),
      sortValue: (row) => row.supplierName,
      render: (row) => <span className="font-medium text-neutral-900 dark:text-neutral-100">{row.supplierName}</span>,
    },
    {
      key: 'account',
      header: t('accounting.suppliers.columns.expenseAccount'),
      render: (row) => (
        <span className="whitespace-nowrap text-neutral-600 dark:text-neutral-400">
          {row.expenseAccountCode} {row.expenseAccountName}
        </span>
      ),
    },
    {
      key: 'amount',
      header: t('fields.amount'),
      align: 'right',
      sortValue: (row) => row.amount,
      render: (row) => <span className="font-semibold tabular-nums">{money(row.amount)}</span>,
    },
    {
      key: 'status',
      header: t('accounting.suppliers.columns.status'),
      sortValue: (row) => (row.paid ? 1 : 0),
      render: (row) =>
        row.paid ? (
          <Badge tone="success">{row.paidDate ? formatDate(row.paidDate) : t('accounting.suppliers.status.paid')}</Badge>
        ) : (
          <Badge tone="warning">{t('accounting.suppliers.status.unpaid')}</Badge>
        ),
    },
  ];

  const handleSave = (values: Parameters<typeof save>[0], paidDate: string | null) => {
    if (attempt(() => save(values, null, paidDate), t('accounting.suppliers.saved')).ok) {
      setCreating(false);
      refresh();
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {openPayables.length > 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t('accounting.suppliers.openPayables')}{' '}
            <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {openPayables.map((entry) => `${entry.supplierName}: ${money(entry.balance)}`).join(' · ')}
            </span>
          </p>
        ) : null}
        <Button className="sm:ml-auto" icon={<Plus size={16} />} onClick={() => setCreating(true)} disabled={expenseAccounts.length === 0}>
          {t('accounting.suppliers.newInvoice')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={invoices}
        getRowKey={(row) => row.id}
        emptyMessage={t('accounting.suppliers.empty')}
        initialSort={{ key: 'date', direction: 'desc' }}
        actions={(row) => (
          <div className="flex justify-end gap-1">
            {row.paid ? (
              <IconButton
                label={t('accounting.suppliers.markUnpaid')}
                onClick={() => {
                  if (attempt(() => markUnpaid(row.id), t('accounting.suppliers.updated')).ok) refresh();
                }}
              >
                <RotateCcw size={16} />
              </IconButton>
            ) : (
              <IconButton
                label={t('accounting.suppliers.markPaid')}
                onClick={() => {
                  if (attempt(() => markPaid(row.id, todayIso()), t('accounting.suppliers.updated')).ok) refresh();
                }}
              >
                <Banknote size={16} />
              </IconButton>
            )}
            <IconButton label={t('actions.delete')} tone="danger" onClick={() => setPendingRemove(row)}>
              <Trash2 size={16} />
            </IconButton>
          </div>
        )}
      />

      {creating ? (
        <SupplierInvoiceForm accounts={expenseAccounts} initialPaidDate={null} onSubmit={handleSave} onClose={() => setCreating(false)} />
      ) : null}

      {pendingRemove ? (
        <ConfirmDialog
          title={t('accounting.suppliers.deleteTitle')}
          message={t('accounting.suppliers.deleteMessage', { supplier: pendingRemove.supplierName })}
          confirmLabel={t('actions.delete')}
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => {
            const target = pendingRemove;
            setPendingRemove(null);
            if (attempt(() => remove(target.id), t('accounting.suppliers.deleted')).ok) refresh();
          }}
        />
      ) : null}
    </>
  );
}
