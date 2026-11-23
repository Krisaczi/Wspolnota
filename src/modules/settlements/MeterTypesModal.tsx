import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, TextInput } from '../../components/ui/FormFields';
import { IconButton } from '../../components/ui/IconButton';
import { Modal } from '../../components/ui/Modal';
import { attempt } from '../../lib/attempt';
import { meterTypeDisplayName } from '../../lib/meterLabels';
import { validateMeterTypeName } from '../../domain/validation/metering';
import type { FieldErrors } from '../../domain/validation/common';
import type { MeterType } from '../../domain/types';
import { useMetersStore } from '../../stores/metersStore';

interface MeterTypesModalProps {
  meterTypes: MeterType[];
  onClose: () => void;
}

export function MeterTypesModal({ meterTypes, onClose }: MeterTypesModalProps) {
  const { t } = useTranslation();
  const saveMeterType = useMetersStore((state) => state.saveMeterType);
  const removeMeterType = useMetersStore((state) => state.removeMeterType);

  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pendingDelete, setPendingDelete] = useState<MeterType | null>(null);

  const resetForm = () => {
    setName('');
    setEditingId(null);
    setErrors({});
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateMeterTypeName(name);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const outcome = attempt(
      () => saveMeterType(result.data, editingId),
      editingId === null ? t('settlements.meterTypesModal.added') : t('settlements.meterTypesModal.updated'),
    );
    if (outcome.ok) resetForm();
  };

  return (
    <>
      <Modal title={t('settlements.meterTypesModal.title')} description={t('settlements.meterTypesModal.description')} onClose={onClose}>
        <div className="space-y-6">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <Field
                label={editingId === null ? t('settlements.meterTypesModal.newType') : t('settlements.meterTypesModal.renameType')}
                htmlFor="meterTypeName"
                error={errors.name}
              >
                <TextInput
                  id="meterTypeName"
                  placeholder={t('settlements.meterTypesModal.namePlaceholder')}
                  value={name}
                  error={errors.name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
            </div>
            <div className="flex gap-2 sm:pt-7">
              {editingId !== null ? (
                <Button variant="secondary" onClick={resetForm}>
                  {t('actions.cancel')}
                </Button>
              ) : null}
              <Button type="submit">{editingId === null ? t('actions.add') : t('actions.save')}</Button>
            </div>
          </form>

          {meterTypes.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('settlements.meterTypesModal.empty')}</p>
          ) : (
            <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {meterTypes.map((meterType) => (
                <li key={meterType.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{meterTypeDisplayName(meterType.name)}</span>
                  <div className="flex gap-1">
                    <IconButton
                      label={t('settlements.meterTypesModal.renameLabel', { name: meterTypeDisplayName(meterType.name) })}
                      onClick={() => {
                        setEditingId(meterType.id);
                        setName(meterType.name);
                        setErrors({});
                      }}
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      label={t('settlements.meterTypesModal.deleteLabel', { name: meterTypeDisplayName(meterType.name) })}
                      tone="danger"
                      onClick={() => setPendingDelete(meterType)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {pendingDelete ? (
        <ConfirmDialog
          title={t('settlements.meterTypesModal.deleteTitle')}
          message={t('settlements.meterTypesModal.deleteMessage', { name: meterTypeDisplayName(pendingDelete.name) })}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const target = pendingDelete;
            setPendingDelete(null);
            attempt(() => removeMeterType(target.id), t('settlements.meterTypesModal.deleted'));
          }}
        />
      ) : null}
    </>
  );
}
