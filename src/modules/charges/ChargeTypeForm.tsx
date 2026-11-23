import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Checkbox, Field, SelectInput, TextInput } from '../../components/ui/FormFields';
import { Modal } from '../../components/ui/Modal';
import type { ChargeTypeInput } from '../../db/repositories/chargeTypesRepo';
import { calculationMethodHelp, calculationMethodLabel } from '../../lib/billingLabels';
import type { CalculationMethod, ChargeType } from '../../domain/types';
import { validateChargeType, type ChargeTypeFormValues } from '../../domain/validation/finance';
import type { FieldErrors } from '../../domain/validation/common';

const FORM_ID = 'charge-type-form';
const METHODS: CalculationMethod[] = ['per_sqm', 'per_resident', 'fixed', 'percentage'];

interface ChargeTypeFormProps {
  chargeType: ChargeType | null;
  currency: string;
  onSubmit: (input: ChargeTypeInput) => void;
  onClose: () => void;
}

export function ChargeTypeForm({ chargeType, currency, onSubmit, onClose }: ChargeTypeFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<ChargeTypeFormValues>({
    name: chargeType?.name ?? '',
    calculationMethod: chargeType?.calculationMethod ?? 'per_sqm',
    rate: chargeType ? String(chargeType.rate) : '',
    active: chargeType?.active ?? true,
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const method = values.calculationMethod as CalculationMethod;
  const rateUnit = method === 'percentage' ? '%' : `${currency} ${t(`billing.methods.${method}.unit`)}`;

  const update = <K extends keyof ChargeTypeFormValues>(key: K, value: ChargeTypeFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateChargeType(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.data);
  };

  return (
    <Modal
      title={chargeType ? t('charges.form.editTitle') : t('charges.addCharge')}
      description={t('charges.form.description')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {chargeType ? t('actions.saveChanges') : t('charges.addCharge')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5">
        <Field label={t('charges.form.name')} htmlFor="chargeName" error={errors.name}>
          <TextInput
            id="chargeName"
            autoFocus
            placeholder={t('charges.form.namePlaceholder')}
            value={values.name}
            error={errors.name}
            onChange={(event) => update('name', event.target.value)}
          />
        </Field>

        <Field
          label={t('charges.form.method')}
          htmlFor="calculationMethod"
          error={errors.calculationMethod}
          hint={calculationMethodHelp(method)}
        >
          <SelectInput
            id="calculationMethod"
            value={values.calculationMethod}
            error={errors.calculationMethod}
            onChange={(event) => update('calculationMethod', event.target.value)}
          >
            {METHODS.map((item) => (
              <option key={item} value={item}>
                {calculationMethodLabel(item)}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={t('charges.form.rate', { unit: rateUnit })} htmlFor="rate" error={errors.rate}>
          <TextInput
            id="rate"
            inputMode="decimal"
            placeholder={method === 'percentage' ? t('charges.form.ratePlaceholderPercent') : t('charges.form.ratePlaceholder')}
            value={values.rate}
            error={errors.rate}
            onChange={(event) => update('rate', event.target.value)}
          />
        </Field>

        <Checkbox id="chargeActive" label={t('charges.form.activeLabel')} checked={values.active} onChange={(checked) => update('active', checked)} />
      </form>
    </Modal>
  );
}
