import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable, type DataColumn } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { SelectInput } from '../../components/ui/FormFields';
import { BalanceText } from '../../components/ui/BalanceText';
import { attempt } from '../../lib/attempt';
import { formatMoney, roundMoney } from '../../lib/money';
import { formatDate } from '../../lib/periods';
import type { PaymentInput } from '../../db/repositories/paymentsRepo';
import type { PaymentView } from '../../domain/types';
import { useApartmentsStore } from '../../stores/apartmentsStore';
import { usePaymentsStore } from '../../stores/paymentsStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { PaymentForm } from './PaymentForm';

type Editor = { mode: 'create' } | { mode: 'edit'; payment: PaymentView } | null;

export function PaymentsPage() {
  const { t } = useTranslation();
  const payments = usePaymentsStore((state) => state.payments);
  const refreshPayments = usePaymentsStore((state) => state.refresh);
  const savePayment = usePaymentsStore((state) => state.save);
  const removePayment = usePaymentsStore((state) => state.remove);
  const apartments = useApartmentsStore((state) => state.items);
  const refreshApartments = useApartmentsStore((state) => state.refresh);
  const currency = useSettingsStore((state) => state.settings.currency);

  const [apartmentFilter, setApartmentFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Editor>(null);
  const [pendingDelete, setPendingDelete] = useState<PaymentView | null>(null);

  useEffect(() => {
    refreshPayments();
    refreshApartments();
  }, [refreshPayments, refreshApartments]);

  const selectedApartment = apartments.find((apartment) => String(apartment.id) === apartmentFilter) ?? null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return payments.filter((payment) => {
      if (apartmentFilter !== 'all' && String(payment.apartmentId) !== apartmentFilter) return false;
      if (!term) return true;
      return (
        payment.apartmentNumber.toLowerCase().includes(term) ||
        (payment.description ?? '').toLowerCase().includes(term)
      );
    });
  }, [payments, apartmentFilter, query]);

  const filteredTotal = roundMoney(filtered.reduce((sum, payment) => sum + payment.amount, 0));

  const columns: DataColumn<PaymentView>[] = [
    {
      key: 'date',
      header: t('fields.date'),
      sortValue: (row) => row.paymentDate,
      render: (row) => formatDate(row.paymentDate),
    },
    {
      key: 'apartment',
      header: t('apartments.columns.apartment'),
      sortValue: (row) => row.apartmentNumber,
      render: (row) => <span className="font-medium text-neutral-900 dark:text-neutral-100">{row.apartmentNumber}</span>,
    },
    {
      key: 'description',
      header: t('fields.description'),
      sortValue: (row) => row.description,
      render: (row) => <span className="text-neutral-600 dark:text-neutral-400">{row.description ?? '-'}</span>,
    },
    {
      key: 'amount',
      header: t('fields.amount'),
      align: 'right',
      sortValue: (row) => row.amount,
      render: (row) => <span className="font-medium text-success-700 dark:text-success-400">{formatMoney(row.amount, currency)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title={t('payments.title')}
        description={t('payments.description')}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setEditor({ mode: 'create' })} disabled={apartments.length === 0}>
            {t('payments.recordPayment')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SelectInput
          aria-label={t('payments.filterApartment')}
          className="sm:w-64"
          value={apartmentFilter}
          onChange={(event) => setApartmentFilter(event.target.value)}
        >
          <option value="all">{t('payments.allApartments')}</option>
          {apartments.map((apartment) => (
            <option key={apartment.id} value={apartment.id}>
              {t('dashboard.paymentApartment', { number: apartment.apartmentNumber })}
            </option>
          ))}
        </SelectInput>
        <SearchInput label={t('payments.searchLabel')} placeholder={t('payments.searchPlaceholder')} value={query} onChange={setQuery} />
      </div>

      {selectedApartment ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-5 py-4 dark:border-primary-900 dark:bg-primary-900/20">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {t('payments.historyTitle', { number: selectedApartment.apartmentNumber })}
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{selectedApartment.ownerName ?? t('apartments.noOwner')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t('payments.currentBalance')}</p>
            <p className="text-lg">
              <BalanceText balance={selectedApartment.balance} currency={currency} />
            </p>
          </div>
        </div>
      ) : null}

      {payments.length === 0 ? (
        <EmptyState
          title={t('payments.emptyTitle')}
          description={t('payments.emptyDescription')}
          action={
            apartments.length > 0 ? (
              <Button icon={<Plus size={16} />} onClick={() => setEditor({ mode: 'create' })}>
                {t('payments.recordPayment')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={filtered}
            getRowKey={(row) => row.id}
            emptyMessage={t('payments.noMatches')}
            initialSort={{ key: 'date', direction: 'desc' }}
            actions={(row) => (
              <div className="flex justify-end gap-1">
                <IconButton label={t('payments.editPayment')} onClick={() => setEditor({ mode: 'edit', payment: row })}>
                  <Pencil size={16} />
                </IconButton>
                <IconButton label={t('payments.deletePayment')} tone="danger" onClick={() => setPendingDelete(row)}>
                  <Trash2 size={16} />
                </IconButton>
              </div>
            )}
          />
          <p className="mt-3 text-right text-sm text-neutral-600 dark:text-neutral-400">
            {t('payments.totalShown')}{' '}
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatMoney(filteredTotal, currency)}</span>
          </p>
        </>
      )}

      {editor ? (
        <PaymentForm
          payment={editor.mode === 'edit' ? editor.payment : null}
          apartments={apartments}
          defaultApartmentId={selectedApartment?.id ?? null}
          initialAllocations={editor.mode === 'edit' ? (editor.payment.allocations ?? null) : null}
          currency={currency}
          onClose={() => setEditor(null)}
          onSubmit={(input: PaymentInput) => {
            const editingId = editor.mode === 'edit' ? editor.payment.id : null;
            const outcome = attempt(
              () => savePayment(input, editingId),
              editingId === null ? t('payments.recorded') : t('payments.updated'),
            );
            if (outcome.ok) {
              setEditor(null);
              refreshApartments();
            }
          }}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={t('payments.deleteTitle')}
          message={t('payments.deleteMessage', {
            amount: formatMoney(pendingDelete.amount, currency),
            date: formatDate(pendingDelete.paymentDate),
            number: pendingDelete.apartmentNumber,
          })}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const target = pendingDelete;
            setPendingDelete(null);
            const outcome = attempt(() => removePayment(target.id), t('payments.deleted'));
            if (outcome.ok) refreshApartments();
          }}
        />
      ) : null}
    </>
  );
}
