import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable, type DataColumn } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { PageHeader } from '../../components/ui/PageHeader';
import { attempt } from '../../lib/attempt';
import { calculationMethodLabel, describeChargeRate } from '../../lib/billingLabels';
import type { ChargeType } from '../../domain/types';
import type { ChargeTypeInput } from '../../db/repositories/chargeTypesRepo';
import { useChargesStore } from '../../stores/chargesStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { ChargeTypeForm } from './ChargeTypeForm';

type Editor = { mode: 'create' } | { mode: 'edit'; chargeType: ChargeType } | null;

export function ChargesPage() {
  const { t } = useTranslation();
  const chargeTypes = useChargesStore((state) => state.chargeTypes);
  const refresh = useChargesStore((state) => state.refresh);
  const save = useChargesStore((state) => state.save);
  const remove = useChargesStore((state) => state.remove);
  const currency = useSettingsStore((state) => state.settings.currency);

  const [editor, setEditor] = useState<Editor>(null);
  const [pendingDelete, setPendingDelete] = useState<ChargeType | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const columns: DataColumn<ChargeType>[] = [
    {
      key: 'name',
      header: t('charges.columns.charge'),
      sortValue: (row) => row.name,
      render: (row) => <span className="font-medium text-neutral-900 dark:text-neutral-100">{row.name}</span>,
    },
    {
      key: 'method',
      header: t('charges.columns.method'),
      sortValue: (row) => calculationMethodLabel(row.calculationMethod),
      render: (row) => calculationMethodLabel(row.calculationMethod),
    },
    {
      key: 'rate',
      header: t('charges.columns.rate'),
      align: 'right',
      sortValue: (row) => row.rate,
      render: (row) => describeChargeRate(row, currency),
    },
    {
      key: 'status',
      header: t('charges.columns.status'),
      sortValue: (row) => (row.active ? 0 : 1),
      render: (row) => (row.active ? <Badge tone="success">{t('charges.active')}</Badge> : <Badge>{t('charges.inactive')}</Badge>),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('charges.title')}
        description={t('charges.description')}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setEditor({ mode: 'create' })}>
            {t('charges.addCharge')}
          </Button>
        }
      />

      {chargeTypes.length === 0 ? (
        <EmptyState
          title={t('charges.emptyTitle')}
          description={t('charges.emptyDescription')}
          action={<Button icon={<Plus size={16} />} onClick={() => setEditor({ mode: 'create' })}>{t('charges.addCharge')}</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={chargeTypes}
          getRowKey={(row) => row.id}
          emptyMessage={t('charges.noCharges')}
          initialSort={{ key: 'name', direction: 'asc' }}
          actions={(row) => (
            <div className="flex justify-end gap-1">
              <IconButton label={t('charges.editCharge')} onClick={() => setEditor({ mode: 'edit', chargeType: row })}>
                <Pencil size={16} />
              </IconButton>
              <IconButton label={t('charges.deleteCharge')} tone="danger" onClick={() => setPendingDelete(row)}>
                <Trash2 size={16} />
              </IconButton>
            </div>
          )}
        />
      )}

      {editor ? (
        <ChargeTypeForm
          chargeType={editor.mode === 'edit' ? editor.chargeType : null}
          currency={currency}
          onClose={() => setEditor(null)}
          onSubmit={(input: ChargeTypeInput) => {
            const editingId = editor.mode === 'edit' ? editor.chargeType.id : null;
            const outcome = attempt(
              () => save(input, editingId),
              editingId === null ? t('charges.added') : t('charges.updated'),
            );
            if (outcome.ok) setEditor(null);
          }}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={t('charges.deleteTitle')}
          message={t('charges.deleteMessage', { name: pendingDelete.name })}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const target = pendingDelete;
            setPendingDelete(null);
            attempt(() => remove(target.id), t('charges.deleted'));
          }}
        />
      ) : null}
    </>
  );
}
