import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, History, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable, type DataColumn } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { attempt } from '../../lib/attempt';
import type { OwnerInput } from '../../db/repositories/ownersRepo';
import type { OwnerView } from '../../domain/types';
import { useApartmentsStore } from '../../stores/apartmentsStore';
import { useOwnersStore } from '../../stores/ownersStore';
import { OwnerForm } from './OwnerForm';
import { OwnerHistoryModal } from './OwnerHistoryModal';
import { TransferOwnershipModal } from './TransferOwnershipModal';

type Editor = { mode: 'create' } | { mode: 'edit'; owner: OwnerView } | null;

export function OwnersPage() {
  const { t } = useTranslation();
  const owners = useOwnersStore((state) => state.items);
  const refreshOwners = useOwnersStore((state) => state.refresh);
  const saveOwner = useOwnersStore((state) => state.save);
  const removeOwner = useOwnersStore((state) => state.remove);
  const apartments = useApartmentsStore((state) => state.items);
  const refreshApartments = useApartmentsStore((state) => state.refresh);

  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Editor>(null);
  const [historyFor, setHistoryFor] = useState<OwnerView | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferApartmentId, setTransferApartmentId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OwnerView | null>(null);

  useEffect(() => {
    refreshOwners();
    refreshApartments();
  }, [refreshOwners, refreshApartments]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return owners;
    return owners.filter(
      (owner) =>
        owner.fullName.toLowerCase().includes(term) ||
        (owner.email ?? '').toLowerCase().includes(term) ||
        (owner.phone ?? '').includes(term),
    );
  }, [owners, query]);

  const columns: DataColumn<OwnerView>[] = [
    {
      key: 'name',
      header: t('owners.columns.fullName'),
      sortValue: (row) => row.fullName,
      render: (row) => <span className="font-medium text-neutral-900 dark:text-neutral-100">{row.fullName}</span>,
    },
    {
      key: 'contact',
      header: t('owners.columns.contact'),
      sortValue: (row) => row.email,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-neutral-800 dark:text-neutral-200">{row.email ?? '-'}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{row.phone ?? t('owners.noPhone')}</p>
        </div>
      ),
    },
    {
      key: 'apartments',
      header: t('owners.columns.apartments'),
      sortValue: (row) => row.apartments.length,
      render: (row) =>
        row.apartments.length === 0 ? (
          <span className="text-neutral-400">{t('owners.none')}</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {row.apartments.map((apartment) => (
              <Badge key={apartment.id} tone="info">
                {apartment.apartmentNumber}
              </Badge>
            ))}
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('owners.title')}
        description={t('owners.description')}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setEditor({ mode: 'create' })}>
            {t('owners.addOwner')}
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput label={t('owners.searchLabel')} placeholder={t('owners.searchPlaceholder')} value={query} onChange={setQuery} />
      </div>

      {owners.length === 0 ? (
        <EmptyState
          title={t('owners.emptyTitle')}
          description={t('owners.emptyDescription')}
          action={<Button icon={<Plus size={16} />} onClick={() => setEditor({ mode: 'create' })}>{t('owners.addOwner')}</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(row) => row.id}
          emptyMessage={t('owners.noMatches')}
          initialSort={{ key: 'name', direction: 'asc' }}
          actions={(row) => (
            <div className="flex justify-end gap-1">
              <IconButton
                label={t('owners.transferApartment')}
                onClick={() => {
                  setTransferApartmentId(row.apartments[0]?.id ?? null);
                  setTransferOpen(true);
                }}
              >
                <ArrowRightLeft size={16} />
              </IconButton>
              <IconButton label={t('owners.viewHistory')} onClick={() => setHistoryFor(row)}>
                <History size={16} />
              </IconButton>
              <IconButton label={t('owners.editOwner')} onClick={() => setEditor({ mode: 'edit', owner: row })}>
                <Pencil size={16} />
              </IconButton>
              <IconButton label={t('owners.deleteOwner')} tone="danger" onClick={() => setPendingDelete(row)}>
                <Trash2 size={16} />
              </IconButton>
            </div>
          )}
        />
      )}

      {editor ? (
        <OwnerForm
          owner={editor.mode === 'edit' ? editor.owner : null}
          onClose={() => setEditor(null)}
          onSubmit={(input: OwnerInput) => {
            const editingId = editor.mode === 'edit' ? editor.owner.id : null;
            const outcome = attempt(
              () => saveOwner(input, editingId),
              editingId === null ? t('owners.added') : t('owners.updated'),
            );
            if (outcome.ok) setEditor(null);
          }}
        />
      ) : null}

      {historyFor ? <OwnerHistoryModal owner={historyFor} onClose={() => setHistoryFor(null)} /> : null}

      {transferOpen ? (
        <TransferOwnershipModal
          apartments={apartments}
          initialApartmentId={transferApartmentId}
          onClose={() => setTransferOpen(false)}
          onTransferred={() => refreshApartments()}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={t('owners.deleteTitle')}
          message={t('owners.deleteMessage', { name: pendingDelete.fullName })}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const target = pendingDelete;
            setPendingDelete(null);
            attempt(() => removeOwner(target.id), t('owners.deleted'));
          }}
        />
      ) : null}
    </>
  );
}
