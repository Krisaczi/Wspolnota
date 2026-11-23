import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/FormFields';
import { Modal } from '../../components/ui/Modal';
import type { OwnerInput } from '../../db/repositories/ownersRepo';
import { validateOwner, type OwnerFormValues } from '../../domain/validation/housing';
import type { FieldErrors } from '../../domain/validation/common';
import type { OwnerView } from '../../domain/types';

const FORM_ID = 'owner-form';

interface OwnerFormProps {
  owner: OwnerView | null;
  onSubmit: (input: OwnerInput) => void;
  onClose: () => void;
}

export function OwnerForm({ owner, onSubmit, onClose }: OwnerFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<OwnerFormValues>({
    fullName: owner?.fullName ?? '',
    email: owner?.email ?? '',
    phone: owner?.phone ?? '',
    address: owner?.address ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = (key: keyof OwnerFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateOwner(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.data);
  };

  return (
    <Modal
      title={owner ? t('owners.form.editTitle') : t('owners.form.addTitle')}
      description={t('owners.form.description')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {owner ? t('actions.saveChanges') : t('owners.addOwner')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t('owners.form.fullName')} htmlFor="fullName" error={errors.fullName}>
            <TextInput
              id="fullName"
              autoFocus
              value={values.fullName}
              error={errors.fullName}
              onChange={(event) => update('fullName', event.target.value)}
            />
          </Field>
        </div>
        <Field label={t('owners.form.email')} htmlFor="email" error={errors.email}>
          <TextInput
            id="email"
            type="email"
            value={values.email}
            error={errors.email}
            onChange={(event) => update('email', event.target.value)}
          />
        </Field>
        <Field label={t('owners.form.phone')} htmlFor="phone" error={errors.phone}>
          <TextInput
            id="phone"
            type="tel"
            value={values.phone}
            error={errors.phone}
            onChange={(event) => update('phone', event.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t('owners.form.address')} htmlFor="address" error={errors.address}>
            <TextInput
              id="address"
              value={values.address}
              error={errors.address}
              onChange={(event) => update('address', event.target.value)}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
