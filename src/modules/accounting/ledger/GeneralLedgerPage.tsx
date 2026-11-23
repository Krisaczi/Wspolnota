import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, SelectInput, TextInput } from '../../../components/ui/FormFields';
import { DataTable, type DataColumn } from '../../../components/ui/DataTable';
import { type DateRange, type LedgerLine } from '../../../domain/accounting/types';
import { accountDisplayName } from '../../../lib/accountLabels';
import { formatMoney, roundMoney } from '../../../lib/money';
import { formatDate, isValidDate, periodDateRange, currentPeriod } from '../../../lib/periods';
import { calculateLedger } from '../../../services/accounting/balanceCalculationService';
import { useAccountingStore } from '../../../stores/accountingStore';
import { useSettingsStore } from '../../../stores/settingsStore';

const DEFAULT_RANGE: DateRange = periodDateRange(currentPeriod());

export function GeneralLedgerPage() {
  const { t } = useTranslation();
  const summaries = useAccountingStore((state) => state.summaries);
  const refresh = useAccountingStore((state) => state.refresh);
  const currency = useSettingsStore((state) => state.settings.currency);
  const money = (value: number) => formatMoney(value, currency);

  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const [accountFilter, setAccountFilter] = useState('');

  useEffect(() => {
    refresh();
  }, [refresh]);

  const accountId = accountFilter === '' ? null : Number(accountFilter);
  const lines = useMemo(() => calculateLedger(range, accountId), [range, accountId]);

  const totalDebit = roundMoney(lines.reduce((sum, line) => sum + line.debitAmount, 0));
  const totalCredit = roundMoney(lines.reduce((sum, line) => sum + line.creditAmount, 0));

  const columns: DataColumn<LedgerLine>[] = [
    {
      key: 'date',
      header: t('fields.date'),
      render: (row) => <span className="whitespace-nowrap">{formatDate(row.entryDate)}</span>,
    },
    {
      key: 'account',
      header: t('fields.account'),
      render: (row) => (
        <span>
          <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{row.accountCode}</span>{' '}
          {accountDisplayName({ code: row.accountCode, name: row.accountName })}
        </span>
      ),
    },
    { key: 'description', header: t('fields.description'), render: (row) => row.description },
    {
      key: 'debit',
      header: t('accounting.journal.debit'),
      align: 'right',
      render: (row) => (row.debitAmount === 0 ? '' : money(row.debitAmount)),
    },
    {
      key: 'credit',
      header: t('accounting.journal.credit'),
      align: 'right',
      render: (row) => (row.creditAmount === 0 ? '' : money(row.creditAmount)),
    },
    {
      key: 'running',
      header: t('accounting.ledger.accountBalance'),
      align: 'right',
      render: (row) => money(row.runningBalance),
    },
  ];

  const updateRange = (patch: Partial<DateRange>) => {
    const next = { ...range, ...patch };
    if (isValidDate(next.from) && isValidDate(next.to) && next.from <= next.to) setRange(next);
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label={t('fields.account')} htmlFor="ledgerAccount">
          <SelectInput id="ledgerAccount" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
            <option value="">{t('accounting.ledger.allAccounts')}</option>
            {summaries.map((summary) => (
              <option key={summary.account.id} value={summary.account.id}>
                {summary.account.code} {accountDisplayName(summary.account)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t('accounting.journal.from')} htmlFor="ledgerFrom">
          <TextInput id="ledgerFrom" type="date" value={range.from} onChange={(event) => updateRange({ from: event.target.value })} />
        </Field>
        <Field label={t('accounting.journal.to')} htmlFor="ledgerTo">
          <TextInput id="ledgerTo" type="date" value={range.to} onChange={(event) => updateRange({ to: event.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3 self-end text-sm tabular-nums">
          <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800/60">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('accounting.ledger.debits')}</p>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{money(totalDebit)}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800/60">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('accounting.ledger.credits')}</p>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{money(totalCredit)}</p>
          </div>
        </div>
      </div>

      <DataTable columns={columns} rows={lines} getRowKey={(row) => row.id} emptyMessage={t('accounting.ledger.empty')} />
    </>
  );
}
