import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextAreaInput, TextInput } from '../../components/ui/FormFields';
import { Modal } from '../../components/ui/Modal';
import { todayIso } from '../../lib/periods';
import { attempt } from '../../lib/attempt';
import { validateTransfer, type TransferFormValues } from '../../domain/validation/housing';
import type { FieldErrors } from '../../domain/validation/common';
import type { ApartmentView } from '../../domain/types';
import { useOwnersStore } from '../../stores/ownersStore';

const FORM_ID = 'transfer-form';

interface TransferOwnershipModalProps {
  apartments: ApartmentView[];
  initialApartmentId: number | null;
  onClose: () => void;
  onTransferred: () => void;
}

export function TransferOwnershipModal({ apartments, initialApartmentId, onClose, onTransferred }: TransferOwnershipModalProps) {
  const { t } = useTranslation();
  const owners = useOwnersStore((state) => state.items);
  const transfer = useOwnersStore((state) => state.transfer);

  const [values, setValues] = useState<TransferFormValues>({
    apartmentId: initialApartmentId === null ? '' : String(initialApartmentId),
    toOwnerId: '',
    transferDate: todayIso(),
    note: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const selectedApartment = apartments.find((apartment) => String(apartment.id) === values.apartmentId);
  const currentOwnerId = selectedApartment?.ownerId ?? null;
  const targetOwners = owners.filter((owner) => owner.id !== currentOwnerId);

  const update = <K extends keyof TransferFormValues>(key: K, value: TransferFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateTransfer(values, currentOwnerId);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const outcome = attempt(() => transfer(result.data), t('owners.transfer.transferred'));
    if (!outcome.ok) return;
    onTransferred();
    onClose();
  };

  return (
    <Modal
      title={t('owners.transfer.title')}
      description={t('owners.transfer.description')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={apartments.length === 0 || owners.length < 2}>
            {t('owners.transfer.submit')}
          </Button>
        </>
      }
    >
      {owners.length < 2 ? (
        <p className="mb-4 rounded-lg bg-warning-100 px-4 py-3 text-sm text-warning-900 dark:bg-warning-900/30 dark:text-warning-200">
          {t('owners.transfer.needTwoOwners')}
        </p>
      ) : null}
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5">
        <Field label={t('owners.transfer.apartment')} htmlFor="transferApartment" error={errors.apartmentId}>
          <SelectInput
            id="transferApartment"
            value={values.apartmentId}
            error={errors.apartmentId}
            onChange={(event) => {
              update('apartmentId', event.target.value);
              update('toOwnerId', '');
            }}
          >
            <option value="">{t('owners.transfer.selectApartment')}</option>
            {apartments.map((apartment) => (
              <option key={apartment.id} value={apartment.id}>
                {apartment.apartmentNumber} - {apartment.ownerName ?? t('apartments.noOwner')}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={t('owners.transfer.currentOwner')} htmlFor="currentOwner">
          <TextInput id="currentOwner" value={selectedApartment?.ownerName ?? t('apartments.noOwner')} readOnly disabled />
        </Field>

        <Field label={t('owners.transfer.newOwner')} htmlFor="toOwnerId" error={errors.toOwnerId}>
          <SelectInput
            id="toOwnerId"
            value={values.toOwnerId}
            error={errors.toOwnerId}
            onChange={(event) => update('toOwnerId', event.target.value)}
          >
            <option value="">{t('owners.transfer.selectNewOwner')}</option>
            {targetOwners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.fullName}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={t('owners.transfer.date')} htmlFor="transferDate" error={errors.transferDate}>
          <TextInput
            id="transferDate"
            type="date"
            value={values.transferDate}
            error={errors.transferDate}
            onChange={(event) => update('transferDate', event.target.value)}
          />
        </Field>

        <Field label={t('owners.transfer.note')} htmlFor="transferNote" error={errors.note}>
          <TextAreaInput
            id="transferNote"
            rows={2}
            value={values.note}
            error={errors.note}
            onChange={(event) => update('note', event.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
