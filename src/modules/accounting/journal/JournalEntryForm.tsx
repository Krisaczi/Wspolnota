import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { Field, SelectInput, TextInput } from '../../../components/ui/FormFields';
import { Modal } from '../../../components/ui/Modal';
import type { Account, JournalEntryInput } from '../../../domain/accounting/types';
import type { FieldErrors } from '../../../domain/validation/common';
import { accountDisplayName } from '../../../lib/accountLabels';
import { formatNumber, parseAmountInput, roundMoney } from '../../../lib/money';
import { todayIso } from '../../../lib/periods';

const FORM_ID = 'journal-entry-form';

interface LineDraft {
  accountId: string;
  debit: string;
  credit: string;
}

const EMPTY_LINE: LineDraft = { accountId: '', debit: '', credit: '' };

function safeAmount(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

interface JournalEntryFormProps {
  accounts: Account[];
  onSubmit: (values: JournalEntryInput) => FieldErrors | null;
  onClose: () => void;
}

export function JournalEntryForm({ accounts, onSubmit, onClose }: JournalEntryFormProps) {
  const { t } = useTranslation();
  const [entryDate, setEntryDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
  const [errors, setErrors] = useState<FieldErrors>({});

  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((current) => current.map((line, position) => (position === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number) => {
    setLines((current) => current.filter((_, position) => position !== index));
  };

  const totalDebit = roundMoney(lines.reduce((sum, line) => sum + safeAmount(parseAmountInput(line.debit)), 0));
  const totalCredit = roundMoney(lines.reduce((sum, line) => sum + safeAmount(parseAmountInput(line.credit)), 0));
  const balanced = totalDebit === totalCredit;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setErrors(
      onSubmit({
        entryDate,
        description,
        lines: lines.map((line) => ({
          accountId: line.accountId === '' ? null : Number(line.accountId),
          debitAmount: parseAmountInput(line.debit),
          creditAmount: parseAmountInput(line.credit),
        })),
      }) ?? {},
    );
  };

  return (
    <Modal
      title={t('accounting.journal.form.title')}
      description={t('accounting.journal.form.description')}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {t('accounting.journal.form.postEntry')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-6">
        {errors.form ? (
          <p role="alert" className="text-sm font-medium text-error-700 dark:text-error-500">
            {errors.form}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label={t('fields.date')} htmlFor="entryDate" error={errors.entryDate}>
            <TextInput id="entryDate" type="date" value={entryDate} error={errors.entryDate} onChange={(event) => setEntryDate(event.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('fields.description')} htmlFor="entryDescription" error={errors.description}>
              <TextInput
                id="entryDescription"
                value={description}
                error={errors.description}
                placeholder={t('accounting.journal.form.descriptionPlaceholder')}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="space-y-3">
          <div className="hidden grid-cols-12 gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 sm:grid dark:text-neutral-400">
            <span className="col-span-5">{t('accounting.journal.columns.account')}</span>
            <span className="col-span-3 text-right">{t('accounting.journal.debit')}</span>
            <span className="col-span-3 text-right">{t('accounting.journal.credit')}</span>
          </div>

          {lines.map((line, index) => {
            const accountError = errors[`line.${index}.account`];
            const amountError = errors[`line.${index}.amount`];
            return (
              <div key={index} className="space-y-1.5">
                <div className="grid grid-cols-12 items-start gap-3">
                  <div className="col-span-12 sm:col-span-5">
                    <SelectInput
                      aria-label={t('accounting.journal.form.accountForLine', { line: index + 1 })}
                      value={line.accountId}
                      error={accountError}
                      onChange={(event) => updateLine(index, { accountId: event.target.value })}
                    >
                      <option value="">{t('accounting.journal.form.chooseAccount')}</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} {accountDisplayName(account)}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <TextInput
                      aria-label={t('accounting.journal.form.debitForLine', { line: index + 1 })}
                      inputMode="decimal"
                      placeholder="0,00"
                      value={line.debit}
                      error={amountError}
                      onChange={(event) => updateLine(index, { debit: event.target.value })}
                      className="text-right tabular-nums"
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <TextInput
                      aria-label={t('accounting.journal.form.creditForLine', { line: index + 1 })}
                      inputMode="decimal"
                      placeholder="0,00"
                      value={line.credit}
                      error={amountError}
                      onChange={(event) => updateLine(index, { credit: event.target.value })}
                      className="text-right tabular-nums"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end sm:col-span-1">
                    <IconButton
                      label={t('accounting.journal.form.removeLine')}
                      tone="danger"
                      disabled={lines.length <= 2}
                      onClick={() => removeLine(index)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
                {amountError ? (
                  <p role="alert" className="text-xs font-medium text-error-700 dark:text-error-500">
                    {amountError}
                  </p>
                ) : null}
              </div>
            );
          })}

          <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
            <Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}>
              {t('accounting.journal.form.addLine')}
            </Button>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm tabular-nums">
              <span className="text-neutral-600 dark:text-neutral-400">
                {t('accounting.journal.debits')}{' '}
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatNumber(totalDebit)}</span>
              </span>
              <span className="text-neutral-600 dark:text-neutral-400">
                {t('accounting.journal.credits')}{' '}
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatNumber(totalCredit)}</span>
              </span>
              <span className={balanced ? 'font-medium text-success-700 dark:text-success-500' : 'font-medium text-warning-700 dark:text-warning-500'}>
                {balanced ? t('accounting.journal.form.balanced') : t('accounting.journal.form.notBalanced')}
              </span>
            </div>
          </div>
          {errors.lines ? (
            <p role="alert" className="text-sm font-medium text-error-700 dark:text-error-500">
              {errors.lines}
            </p>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
