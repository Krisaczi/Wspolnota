import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, Pencil, Plus, Trash2, DoorOpen } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { SelectInput } from '../../components/ui/FormFields';
import { BalanceStatusBadge, BalanceText } from '../../components/ui/BalanceText';
import { Badge } from '../../components/ui/Badge';
import { formatMoney, formatNumber } from '../../lib/money';
import { listInterestRates } from '../../db/repositories/interestRatesRepo';
import { calculateTotalInterest } from '../../domain/interest';
import { todayIso } from '../../lib/periods';
import { attempt } from '../../lib/attempt';
import type { ApartmentView } from '../../domain/types';
import { useApartmentsStore } from '../../stores/apartmentsStore';
import { useOwnersStore } from '../../stores/ownersStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { ApartmentForm } from './ApartmentForm';
import { ApartmentDetailsModal } from './ApartmentDetailsModal';
import { TransferOwnershipModal } from '../owners/TransferOwnershipModal';
import type { ApartmentInput } from '../../db/repositories/apartmentsRepo';

type StatusFilter = 'all' | 'active' | 'inactive';
type BalanceFilter = 'all' | 'debt' | 'credit' | 'settled';

type Editor = { mode: 'create' } | { mode: 'edit'; apartment: ApartmentView } | null;

export function ApartmentsPage() {
  const { t } = useTranslation();
  const apartments = useApartmentsStore((state) => state.items);
  const refreshApartments = useApartmentsStore((state) => state.refresh);
  const saveApartment = useApartmentsStore((state) => state.save);
  const removeApartment = useApartmentsStore((state) => state.remove);
  const owners = useOwnersStore((state) => state.items);
  const refreshOwners = useOwnersStore((state) => state.refresh);
  const currency = useSettingsStore((state) => state.settings.currency);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all');
  const [editor, setEditor] = useState<Editor>(null);
  const [pendingDelete, setPendingDelete] = useState<ApartmentView | null>(null);
  const [transferFor, setTransferFor] = useState<ApartmentView | null>(null);
  const [detailsFor, setDetailsFor] = useState<ApartmentView | null>(null);

  useEffect(() => {
    refreshApartments();
    refreshOwners();
  }, [refreshApartments, refreshOwners]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const result = apartments.filter((apartment) => {
      if (term && !apartment.apartmentNumber.toLowerCase().includes(term) && !(apartment.ownerName ?? '').toLowerCase().includes(term)) {
        return false;
      }
      if (statusFilter === 'active' && !apartment.active) return false;
      if (statusFilter === 'inactive' && apartment.active) return false;
      if (balanceFilter === 'debt' && !(apartment.balance > 0.005)) return false;
      if (balanceFilter === 'credit' && !(apartment.balance < -0.005)) return false;
      if (balanceFilter === 'settled' && Math.abs(apartment.balance) > 0.005) return false;
      return true;
    });
    return result.sort((a, b) => a.apartmentNumber.localeCompare(b.apartmentNumber, undefined, { numeric: true }));
  }, [apartments, query, statusFilter, balanceFilter]);

  const interestByApartment = useMemo(() => {
    const today = todayIso();
    return new Map(
      apartments
        .filter((apartment) => apartment.balance > 0.005)
        .map((apartment) => [
          apartment.id,
          calculateTotalInterest(apartment.balance, listInterestRates(apartment.id), today),
        ]),
    );
  }, [apartments]);

  const takenNumbers = apartments.map((apartment) => apartment.apartmentNumber);

  return (
    <>
      <PageHeader
        title={t('apartments.title')}
        description={t('apartments.description')}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setEditor({ mode: 'create' })}>
            {t('apartments.addApartment')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          label={t('apartments.searchLabel')}
          placeholder={t('apartments.searchPlaceholder')}
          value={query}
          onChange={setQuery}
        />
        <SelectInput aria-label={t('apartments.filterStatus')} className="sm:w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
          <option value="all">{t('apartments.allStatuses')}</option>
          <option value="active">{t('apartments.activeOnly')}</option>
          <option value="inactive">{t('apartments.inactiveOnly')}</option>
        </SelectInput>
        <SelectInput aria-label={t('apartments.filterBalance')} className="sm:w-44" value={balanceFilter} onChange={(event) => setBalanceFilter(event.target.value as BalanceFilter)}>
          <option value="all">{t('apartments.allBalances')}</option>
          <option value="debt">{t('balance.filter.debt')}</option>
          <option value="credit">{t('balance.filter.credit')}</option>
          <option value="settled">{t('balance.status.settled')}</option>
        </SelectInput>
      </div>

      {apartments.length === 0 ? (
        <EmptyState
          title={t('apartments.emptyTitle')}
          description={t('apartments.emptyDescription')}
          action={<Button icon={<Plus size={16} />} onClick={() => setEditor({ mode: 'create' })}>{t('apartments.addApartment')}</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title={t('apartments.noMatches')} description="" />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((apartment) => {
            const interest = interestByApartment.get(apartment.id) ?? 0;
            return (
            <div
              key={apartment.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetailsFor(apartment)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setDetailsFor(apartment);
                }
              }}
              className="flex cursor-pointer flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                    <DoorOpen size={20} />
                  </span>
                  <div>
                    <p className="text-base font-semibold leading-tight text-neutral-900 dark:text-neutral-100">
                      {t('dashboard.paymentApartment', { number: apartment.apartmentNumber })}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {apartment.ownerName ?? <span className="text-neutral-400">{t('apartments.noOwner')}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton label={t('apartments.transferOwnership')} onClick={(event) => { event.stopPropagation(); setTransferFor(apartment); }}>
                    <ArrowRightLeft size={16} />
                  </IconButton>
                  <IconButton label={t('apartments.editApartment')} onClick={(event) => { event.stopPropagation(); setEditor({ mode: 'edit', apartment }); }}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton label={t('apartments.deleteApartment')} tone="danger" onClick={(event) => { event.stopPropagation(); setPendingDelete(apartment); }}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <div>
                  <p>{t('apartments.columns.area')}</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{formatNumber(apartment.areaM2)}</p>
                </div>
                <div>
                  <p>{t('fields.residents')}</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{apartment.residentsCount}</p>
                </div>
                <div>
                  <p>{t('apartments.columns.share')}</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{formatNumber(apartment.shareRatio, 4)}</p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                <div className="flex flex-col">
                  <BalanceText balance={apartment.balance} currency={currency} />
                  {apartment.balance > 0.005 && interest > 0 && (
                    <span className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {t('interest.tileLabel', { amount: formatMoney(interest, currency) })}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {apartment.active ? <Badge tone="success">{t('apartments.active')}</Badge> : <Badge>{t('apartments.inactive')}</Badge>}
                  <BalanceStatusBadge balance={apartment.balance} />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {detailsFor ? <ApartmentDetailsModal apartment={detailsFor} onClose={() => setDetailsFor(null)} /> : null}

      {editor ? (
        <ApartmentForm
          apartment={editor.mode === 'edit' ? editor.apartment : null}
          owners={owners}
          takenNumbers={takenNumbers}
          onClose={() => setEditor(null)}
          onSubmit={(input: ApartmentInput) => {
            const editingId = editor.mode === 'edit' ? editor.apartment.id : null;
            const outcome = attempt(
              () => saveApartment(input, editingId),
              editingId === null ? t('apartments.added') : t('apartments.updated'),
            );
            if (outcome.ok) setEditor(null);
          }}
        />
      ) : null}

      {transferFor ? (
        <TransferOwnershipModal
          apartments={apartments}
          initialApartmentId={transferFor.id}
          onClose={() => setTransferFor(null)}
          onTransferred={() => refreshApartments()}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={t('apartments.deleteTitle')}
          message={t('apartments.deleteMessage', { number: pendingDelete.apartmentNumber })}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const target = pendingDelete;
            setPendingDelete(null);
            attempt(() => removeApartment(target.id), t('apartments.deleted'));
          }}
        />
      ) : null}
    </>
  );
}
