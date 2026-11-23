import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../../components/ui/FormFields';
import { Modal } from '../../../components/ui/Modal';
import { ACCOUNT_TYPES, type Account } from '../../../domain/accounting/types';
import type { FieldErrors } from '../../../domain/validation/common';
import { accountTypeLabel } from '../../../lib/accountLabels';
import type { AccountFormValues } from '../../../services/accounting/accountingService';

const FORM_ID = 'account-form';

interface AccountFormProps {
  account: Account | null;
  onSubmit: (values: AccountFormValues) => FieldErrors | null;
  onClose: () => void;
}

export function AccountForm({ account, onSubmit, onClose }: AccountFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<AccountFormValues>({
    code: account?.code ?? '',
    name: account?.name ?? '',
    type: account?.type ?? 'EXPENSE',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const typeLocked = account !== null && (account.systemAccount || account.hasTransactions);

  const update = (key: keyof AccountFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setErrors(onSubmit(values) ?? {});
  };

  return (
    <Modal
      title={account ? t('accounting.chart.editAccount') : t('accounting.chart.newAccount')}
      description={t('accounting.chart.formDescription')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {account ? t('accounting.chart.saveChanges') : t('accounting.chart.createAccount')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t('accounting.chart.code')} htmlFor="accountCode" error={errors.code} hint={t('accounting.chart.codeHint')}>
          <TextInput id="accountCode" value={values.code} error={errors.code} onChange={(event) => update('code', event.target.value)} />
        </Field>
        <Field
          label={t('fields.type')}
          htmlFor="accountType"
          error={errors.type}
          hint={typeLocked ? t('accounting.chart.typeLocked') : undefined}
        >
          <SelectInput
            id="accountType"
            value={values.type}
            error={errors.type}
            disabled={typeLocked}
            onChange={(event) => update('type', event.target.value)}
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {accountTypeLabel(type)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="sm:col-span-2">
          <Field label={t('accounting.chart.accountName')} htmlFor="accountName" error={errors.name}>
            <TextInput id="accountName" value={values.name} error={errors.name} onChange={(event) => update('name', event.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
