import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, Checkbox, SelectInput, TextInput } from '../../components/ui/FormFields';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { ApartmentInput } from '../../db/repositories/apartmentsRepo';
import { validateApartment, type ApartmentFormValues } from '../../domain/validation/housing';
import type { ApartmentView, OwnerView } from '../../domain/types';
import type { FieldErrors } from '../../domain/validation/common';

interface ApartmentFormProps {
  apartment: ApartmentView | null;
  owners: OwnerView[];
  takenNumbers: string[];
  onSubmit: (input: ApartmentInput) => void;
  onClose: () => void;
}

const FORM_ID = 'apartment-form';

function initialValues(apartment: ApartmentView | null): ApartmentFormValues {
  if (!apartment) {
    return { apartmentNumber: '', ownerId: '', areaM2: '', residentsCount: '0', shareRatio: '0', startingBalance: '0', active: true };
  }
  return {
    apartmentNumber: apartment.apartmentNumber,
    ownerId: apartment.ownerId === null ? '' : String(apartment.ownerId),
    areaM2: String(apartment.areaM2),
    residentsCount: String(apartment.residentsCount),
    shareRatio: String(apartment.shareRatio),
    startingBalance: String(apartment.startingBalance),
    active: apartment.active,
  };
}

export function ApartmentForm({ apartment, owners, takenNumbers, onSubmit, onClose }: ApartmentFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<ApartmentFormValues>(() => initialValues(apartment));
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = <K extends keyof ApartmentFormValues>(key: K, value: ApartmentFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const takenByOthers = takenNumbers.filter((number) => number !== apartment?.apartmentNumber);
    const result = validateApartment(values, takenByOthers);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.data);
  };

  return (
    <Modal
      title={apartment ? t('apartments.form.editTitle', { number: apartment.apartmentNumber }) : t('apartments.addApartment')}
      description={t('apartments.form.description')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {apartment ? t('actions.saveChanges') : t('apartments.addApartment')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t('apartments.form.number')} htmlFor="apartmentNumber" error={errors.apartmentNumber}>
          <TextInput
            id="apartmentNumber"
            value={values.apartmentNumber}
            onChange={(event) => update('apartmentNumber', event.target.value)}
            error={errors.apartmentNumber}
            placeholder={t('apartments.form.numberPlaceholder')}
            autoFocus
          />
        </Field>

        <Field
          label={t('fields.owner')}
          htmlFor="ownerId"
          hint={apartment ? t('apartments.form.ownerHintEdit') : t('apartments.form.ownerHintCreate')}
        >
          {apartment ? (
            <TextInput id="ownerId" value={apartment.ownerName ?? t('apartments.noOwner')} disabled readOnly />
          ) : (
            <SelectInput id="ownerId" value={values.ownerId} onChange={(event) => update('ownerId', event.target.value)}>
              <option value="">{t('apartments.noOwner')}</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.fullName}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        <Field label={t('apartments.columns.area')} htmlFor="areaM2" error={errors.areaM2}>
          <TextInput
            id="areaM2"
            inputMode="decimal"
            value={values.areaM2}
            onChange={(event) => update('areaM2', event.target.value)}
            error={errors.areaM2}
            placeholder={t('apartments.form.areaPlaceholder')}
          />
        </Field>

        <Field label={t('fields.residents')} htmlFor="residentsCount" error={errors.residentsCount}>
          <TextInput
            id="residentsCount"
            inputMode="numeric"
            value={values.residentsCount}
            onChange={(event) => update('residentsCount', event.target.value)}
            error={errors.residentsCount}
          />
        </Field>

        <Field label={t('apartments.form.shareRatio')} htmlFor="shareRatio" error={errors.shareRatio} hint={t('apartments.form.shareHint')}>
          <TextInput
            id="shareRatio"
            inputMode="decimal"
            value={values.shareRatio}
            onChange={(event) => update('shareRatio', event.target.value)}
            error={errors.shareRatio}
          />
        </Field>

        <Field
          label={t('apartments.form.startingBalance')}
          htmlFor="startingBalance"
          error={errors.startingBalance}
          hint={t('apartments.form.startingBalanceHint')}
        >
          <TextInput
            id="startingBalance"
            inputMode="decimal"
            value={values.startingBalance}
            onChange={(event) => update('startingBalance', event.target.value)}
            error={errors.startingBalance}
          />
        </Field>

        <div className="flex items-end pb-2">
          <Checkbox id="active" label={t('apartments.form.activeLabel')} checked={values.active} onChange={(checked) => update('active', checked)} />
        </div>
      </form>
    </Modal>
  );
}
