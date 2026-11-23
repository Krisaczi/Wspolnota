import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, SelectInput, TextAreaInput, TextInput } from '../../../components/ui/FormFields';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import type { Account, SupplierInvoiceInput } from '../../../domain/accounting/types';
import { accountDisplayName } from '../../../lib/accountLabels';
import { parseAmountInput } from '../../../lib/money';
import { todayIso } from '../../../lib/periods';

const FORM_ID = 'supplier-invoice-form';

interface SupplierInvoiceFormProps {
  accounts: Account[];
  initialPaidDate: string | null;
  onSubmit: (values: SupplierInvoiceInput, paidDate: string | null) => void;
  onClose: () => void;
}

export function SupplierInvoiceForm({ accounts, initialPaidDate, onSubmit, onClose }: SupplierInvoiceFormProps) {
  const { t } = useTranslation();
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [supplierName, setSupplierName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [paid, setPaid] = useState(initialPaidDate !== null);
  const [paidDate, setPaidDate] = useState(initialPaidDate ?? todayIso());

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (supplierName.trim() === '' || expenseAccountId === '' || parseAmountInput(amount) <= 0) return;
    onSubmit(
      {
        invoiceDate,
        supplierName: supplierName.trim(),
        description: description.trim() === '' ? null : description.trim(),
        amount: parseAmountInput(amount),
        expenseAccountId: Number(expenseAccountId),
      },
      paid ? paidDate : null,
    );
  };

  return (
    <Modal
      title={t('accounting.suppliers.form.title')}
      description={t('accounting.suppliers.form.description')}
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
          <Field label={t('accounting.suppliers.form.invoiceDate')} htmlFor="invoiceDate">
            <TextInput id="invoiceDate" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} required />
          </Field>
          <Field label={t('accounting.suppliers.form.supplier')} htmlFor="supplierName">
            <TextInput
              id="supplierName"
              value={supplierName}
              placeholder={t('accounting.suppliers.form.supplierPlaceholder')}
              onChange={(event) => setSupplierName(event.target.value)}
              required
            />
          </Field>
        </div>
        <Field label={t('accounting.suppliers.form.expenseAccount')} htmlFor="expenseAccount">
          <SelectInput id="expenseAccount" value={expenseAccountId} onChange={(event) => setExpenseAccountId(event.target.value)} required>
            <option value="">{t('accounting.suppliers.form.chooseAccount')}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} {accountDisplayName(account)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t('fields.amount')} htmlFor="invoiceAmount">
          <TextInput
            id="invoiceAmount"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="text-right tabular-nums"
            required
          />
        </Field>
        <Field label={t('fields.description')} htmlFor="invoiceDescription">
          <TextAreaInput id="invoiceDescription" value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <div className="flex items-center gap-3">
          <label htmlFor="invoicePaid" className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              id="invoicePaid"
              type="checkbox"
              checked={paid}
              onChange={(event) => setPaid(event.target.checked)}
              className="size-4 rounded border-neutral-300 text-primary-700 focus:ring-primary-600"
            />
            {t('accounting.suppliers.form.paid')}
          </label>
        </div>
        {paid ? (
          <Field label={t('accounting.suppliers.form.paidDate')} htmlFor="paidDate">
            <TextInput id="paidDate" type="date" value={paidDate} onChange={(event) => setPaidDate(event.target.value)} required />
          </Field>
        ) : null}
      </form>
    </Modal>
  );
}
