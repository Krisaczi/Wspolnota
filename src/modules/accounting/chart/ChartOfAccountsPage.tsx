import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DataTable, type DataColumn } from '../../../components/ui/DataTable';
import { IconButton } from '../../../components/ui/IconButton';
import { SearchInput } from '../../../components/ui/SearchInput';
import { SelectInput } from '../../../components/ui/FormFields';
import { Badge } from '../../../components/ui/Badge';
import { ACCOUNT_TYPES, type Account, type AccountType } from '../../../domain/accounting/types';
import { accountDisplayName, accountTypeLabel } from '../../../lib/accountLabels';
import { formatMoney } from '../../../lib/money';
import { attempt } from '../../../lib/attempt';
import { saveAccount, removeAccount, setAccountArchived } from '../../../services/accounting/accountingService';
import type { AccountSummary } from '../../../services/accounting/balanceCalculationService';
import { useAccountingStore } from '../../../stores/accountingStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { toast } from '../../../stores/toastStore';
import { AccountForm } from './AccountForm';

type Editor = { mode: 'create' } | { mode: 'edit'; account: Account } | null;
type PendingAction = { kind: 'archive' | 'delete'; account: Account } | null;

export function ChartOfAccountsPage() {
  const { t } = useTranslation();
  const summaries = useAccountingStore((state) => state.summaries);
  const refresh = useAccountingStore((state) => state.refresh);
  const currency = useSettingsStore((state) => state.settings.currency);
  const money = (value: number) => formatMoney(value, currency);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | AccountType>('all');
  const [editor, setEditor] = useState<Editor>(null);
  const [pending, setPending] = useState<PendingAction>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return summaries.filter((summary) => {
      const { account } = summary;
      if (typeFilter !== 'all' && account.type !== typeFilter) return false;
      if (!term) return true;
      return account.code.toLowerCase().includes(term) || accountDisplayName(account).toLowerCase().includes(term);
    });
  }, [summaries, query, typeFilter]);

  const columns: DataColumn<AccountSummary>[] = [
    {
      key: 'code',
      header: t('accounting.chart.columns.code'),
      sortValue: (row) => row.account.code,
      render: (row) => <span className="font-mono text-neutral-900 dark:text-neutral-100">{row.account.code}</span>,
    },
    {
      key: 'name',
      header: t('accounting.chart.columns.account'),
      sortValue: (row) => accountDisplayName(row.account),
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{accountDisplayName(row.account)}</span>
          {row.account.systemAccount ? <Badge tone="info">{t('accounting.chart.builtIn')}</Badge> : null}
        </span>
      ),
    },
    {
      key: 'type',
      header: t('fields.type'),
      sortValue: (row) => accountTypeLabel(row.account.type),
      render: (row) => accountTypeLabel(row.account.type),
    },
    {
      key: 'balance',
      header: t('accounting.chart.columns.currentBalance'),
      align: 'right',
      sortValue: (row) => row.balance,
      render: (row) => <span className="font-semibold">{money(row.balance)}</span>,
    },
    {
      key: 'turnover',
      header: t('accounting.chart.columns.monthlyTurnover'),
      align: 'right',
      sortValue: (row) => row.periodTurnover,
      render: (row) => money(row.periodTurnover),
    },
    {
      key: 'debits',
      header: t('accounting.chart.columns.totalDebits'),
      align: 'right',
      sortValue: (row) => row.totalDebits,
      render: (row) => money(row.totalDebits),
    },
    {
      key: 'credits',
      header: t('accounting.chart.columns.totalCredits'),
      align: 'right',
      sortValue: (row) => row.totalCredits,
      render: (row) => money(row.totalCredits),
    },
    {
      key: 'status',
      header: t('accounting.chart.columns.status'),
      sortValue: (row) => (row.account.active ? 0 : 1),
      render: (row) => (
        <Badge tone={row.account.active ? 'success' : 'neutral'}>
          {row.account.active ? t('accounting.chart.active') : t('accounting.chart.archived')}
        </Badge>
      ),
    },
  ];

  const handleSave = (account: Account | null, values: Parameters<typeof saveAccount>[0]) => {
    const result = saveAccount(values, account?.id ?? null);
    if (!result.ok) return result.errors;
    toast.success(account ? t('accounting.chart.accountUpdated') : t('accounting.chart.accountCreated'));
    setEditor(null);
    refresh();
    return null;
  };

  const runPending = () => {
    if (!pending) return;
    const target = pending.account;
    setPending(null);
    if (pending.kind === 'delete') {
      if (attempt(() => removeAccount(target.id), t('accounting.chart.accountDeleted')).ok) refresh();
    } else if (attempt(() => setAccountArchived(target.id, true), t('accounting.chart.accountArchived')).ok) {
      refresh();
    }
  };

  const reactivate = (account: Account) => {
    if (attempt(() => setAccountArchived(account.id, false), t('accounting.chart.accountReactivated')).ok) refresh();
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          label={t('accounting.chart.searchLabel')}
          placeholder={t('accounting.chart.searchPlaceholder')}
          value={query}
          onChange={setQuery}
        />
        <SelectInput
          aria-label={t('accounting.chart.filterByType')}
          className="sm:w-56"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as 'all' | AccountType)}
        >
          <option value="all">{t('accounting.chart.allTypes')}</option>
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>
              {accountTypeLabel(type)}
            </option>
          ))}
        </SelectInput>
        <Button className="sm:ml-auto" icon={<Plus size={16} />} onClick={() => setEditor({ mode: 'create' })}>
          {t('accounting.chart.newAccount')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(row) => row.account.id}
        emptyMessage={t('accounting.chart.noMatches')}
        initialSort={{ key: 'code', direction: 'asc' }}
        actions={(row) => (
          <div className="flex justify-end gap-1">
            <IconButton label={t('accounting.chart.editAccountLabel')} onClick={() => setEditor({ mode: 'edit', account: row.account })}>
              <Pencil size={16} />
            </IconButton>
            {row.account.active ? (
              <IconButton
                label={
                  row.account.systemAccount
                    ? t('accounting.chart.builtInNoArchive')
                    : t('accounting.chart.archiveAccountLabel')
                }
                onClick={() => setPending({ kind: 'archive', account: row.account })}
                disabled={row.account.systemAccount}
              >
                <Archive size={16} />
              </IconButton>
            ) : (
              <IconButton label={t('accounting.chart.reactivateAccountLabel')} onClick={() => reactivate(row.account)}>
                <RotateCcw size={16} />
              </IconButton>
            )}
            {!row.account.systemAccount && !row.account.hasTransactions ? (
              <IconButton
                label={t('accounting.chart.deleteAccountLabel')}
                tone="danger"
                onClick={() => setPending({ kind: 'delete', account: row.account })}
              >
                <Trash2 size={16} />
              </IconButton>
            ) : null}
          </div>
        )}
      />

      {editor ? (
        <AccountForm
          account={editor.mode === 'edit' ? editor.account : null}
          onClose={() => setEditor(null)}
          onSubmit={(values) => handleSave(editor.mode === 'edit' ? editor.account : null, values)}
        />
      ) : null}

      {pending ? (
        <ConfirmDialog
          title={pending.kind === 'delete' ? t('accounting.chart.deleteTitle') : t('accounting.chart.archiveTitle')}
          message={
            pending.kind === 'delete'
              ? t('accounting.chart.deleteMessage', { name: accountDisplayName(pending.account) })
              : t('accounting.chart.archiveMessage', { name: accountDisplayName(pending.account) })
          }
          confirmLabel={pending.kind === 'delete' ? t('actions.delete') : t('accounting.chart.archive')}
          onCancel={() => setPending(null)}
          onConfirm={runPending}
        />
      ) : null}
    </>
  );
}
