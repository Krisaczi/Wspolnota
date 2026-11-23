import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, SelectInput, TextInput } from '../../../components/ui/FormFields';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import type { OtherIncomeInput } from '../../../domain/accounting/types';
import { parseAmountInput } from '../../../lib/money';
import { todayIso } from '../../../lib/periods';

const FORM_ID = 'other-income-form';

interface OtherIncomeFormProps {
  onSubmit: (values: OtherIncomeInput) => void;
  onClose: () => void;
}

export function OtherIncomeForm({ onSubmit, onClose }: OtherIncomeFormProps) {
  const { t } = useTranslation();
  const [incomeDate, setIncomeDate] = useState(todayIso());
  const [incomeType, setIncomeType] = useState<'interest' | 'other'>('interest');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (parseAmountInput(amount) <= 0) return;
    onSubmit({
      incomeDate,
      incomeType,
      amount: parseAmountInput(amount),
      description: description.trim() === '' ? null : description.trim(),
    });
  };

  return (
    <Modal
      title={t('accounting.otherIncome.form.title')}
      description={t('accounting.otherIncome.form.description')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {t('actions.save')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={t('fields.date')} htmlFor="incomeDate">
            <TextInput id="incomeDate" type="date" value={incomeDate} onChange={(event) => setIncomeDate(event.target.value)} required />
          </Field>
          <Field label={t('accounting.otherIncome.form.type')} htmlFor="incomeType">
            <SelectInput id="incomeType" value={incomeType} onChange={(event) => setIncomeType(event.target.value as 'interest' | 'other')}>
              <option value="interest">{t('accounting.otherIncome.types.interest')}</option>
              <option value="other">{t('accounting.otherIncome.types.other')}</option>
            </SelectInput>
          </Field>
        </div>
        <Field label={t('fields.amount')} htmlFor="incomeAmount">
          <TextInput
            id="incomeAmount"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="text-right tabular-nums"
            required
          />
        </Field>
        <Field label={t('fields.description')} htmlFor="incomeDescription">
          <TextInput id="incomeDescription" value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
