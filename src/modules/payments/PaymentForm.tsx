import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextAreaInput, TextInput } from '../../components/ui/FormFields';
import { Modal } from '../../components/ui/Modal';
import type { PaymentInput } from '../../db/repositories/paymentsRepo';
import { validatePayment, type PaymentFormValues } from '../../domain/validation/finance';
import type { FieldErrors } from '../../domain/validation/common';
import type { ApartmentView, PaymentView } from '../../domain/types';
import { todayIso } from '../../lib/periods';

const FORM_ID = 'payment-form';

interface PaymentFormProps {
  payment: PaymentView | null;
  apartments: ApartmentView[];
  defaultApartmentId: number | null;
  currency: string;
  onSubmit: (input: PaymentInput) => void;
  onClose: () => void;
}

export function PaymentForm({ payment, apartments, defaultApartmentId, currency, onSubmit, onClose }: PaymentFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<PaymentFormValues>({
    apartmentId: payment
      ? String(payment.apartmentId)
      : defaultApartmentId === null
        ? ''
        : String(defaultApartmentId),
    paymentDate: payment?.paymentDate ?? todayIso(),
    amount: payment ? String(payment.amount) : '',
    description: payment?.description ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = (key: keyof PaymentFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validatePayment(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.data);
  };

  return (
    <Modal
      title={payment ? t('payments.form.editTitle') : t('payments.recordPayment')}
      description={t('payments.form.description')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {payment ? t('actions.saveChanges') : t('payments.recordPayment')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t('apartments.columns.apartment')} htmlFor="paymentApartment" error={errors.apartmentId}>
            <SelectInput
              id="paymentApartment"
              value={values.apartmentId}
              error={errors.apartmentId}
              onChange={(event) => update('apartmentId', event.target.value)}
            >
              <option value="">{t('apartments.selectApartment')}</option>
              {apartments.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.apartmentNumber} - {apartment.ownerName ?? t('apartments.noOwner')}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label={t('payments.form.date')} htmlFor="paymentDate" error={errors.paymentDate}>
          <TextInput
            id="paymentDate"
            type="date"
            value={values.paymentDate}
            error={errors.paymentDate}
            onChange={(event) => update('paymentDate', event.target.value)}
          />
        </Field>
        <Field label={t('payments.form.amount', { currency })} htmlFor="paymentAmount" error={errors.amount}>
          <TextInput
            id="paymentAmount"
            inputMode="decimal"
            placeholder="0,00"
            value={values.amount}
            error={errors.amount}
            onChange={(event) => update('amount', event.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t('payments.form.descriptionOptional')} htmlFor="paymentDescription" error={errors.description}>
            <TextAreaInput
              id="paymentDescription"
              rows={2}
              placeholder={t('payments.form.descriptionPlaceholder')}
              value={values.description}
              error={errors.description}
              onChange={(event) => update('description', event.target.value)}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
