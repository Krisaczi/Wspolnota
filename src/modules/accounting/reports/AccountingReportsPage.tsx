import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Banknote, BarChart3, FileText, ListTree, TrendingDown, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../../components/ui/FormFields';
import { ReportActions } from '../../reports/ReportActions';
import { ReportPreview } from '../../reports/ReportPreview';
import { accountDisplayName } from '../../../lib/accountLabels';
import { attempt } from '../../../lib/attempt';
import { currentPeriod, isValidDate, periodDateRange } from '../../../lib/periods';
import { useAccountingStore } from '../../../stores/accountingStore';
import {
  buildAccountStatement,
  buildCashMovement,
  buildExpenseSummary,
  buildGeneralLedger,
  buildIncomeSummary,
  buildMonthlyProfitAndLoss,
  buildTrialBalance,
} from '../../../services/accounting/reportingService';
import type { ReportDocument } from '../../../services/reports/types';

type AccountingReportKind = 'trial' | 'ledger' | 'statement' | 'income' | 'expense' | 'pnl' | 'cash';

const REPORT_OPTIONS: { kind: AccountingReportKind; icon: LucideIcon }[] = [
  { kind: 'trial', icon: ListTree },
  { kind: 'ledger', icon: FileText },
  { kind: 'statement', icon: Wallet },
  { kind: 'income', icon: TrendingUp },
  { kind: 'expense', icon: TrendingDown },
  { kind: 'pnl', icon: BarChart3 },
  { kind: 'cash', icon: Banknote },
];

interface ReportParams {
  kind: AccountingReportKind;
  from: string;
  to: string;
  accountId: string;
}

const INITIAL_RANGE = periodDateRange(currentPeriod());

function validateParams(params: ReportParams): string | null {
  if (!isValidDate(params.from) || !isValidDate(params.to)) return 'accounting.reports.errors.invalidDates';
  if (params.from > params.to) return 'accounting.reports.errors.rangeOrder';
  if (params.kind === 'statement' && !params.accountId) return 'accounting.reports.errors.accountRequired';
  return null;
}

function buildReport(params: ReportParams): ReportDocument {
  const range = { from: params.from, to: params.to };
  switch (params.kind) {
    case 'trial':
      return buildTrialBalance(params.to);
    case 'ledger':
      return buildGeneralLedger(range, params.accountId === '' ? null : Number(params.accountId));
    case 'statement':
      return buildAccountStatement(Number(params.accountId), range);
    case 'income':
      return buildIncomeSummary(range);
    case 'expense':
      return buildExpenseSummary(range);
    case 'pnl':
      return buildMonthlyProfitAndLoss(range);
    case 'cash':
      return buildCashMovement(range);
  }
}

export function AccountingReportsPage() {
  const { t } = useTranslation();
  const summaries = useAccountingStore((state) => state.summaries);
  const refresh = useAccountingStore((state) => state.refresh);

  const [params, setParams] = useState<ReportParams>({
    kind: 'trial',
    from: INITIAL_RANGE.from,
    to: INITIAL_RANGE.to,
    accountId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportDocument | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = (patch: Partial<ReportParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setReport(null);
    setError(null);
  };

  const usesAccount = params.kind === 'ledger' || params.kind === 'statement';
  const usesRange = params.kind !== 'trial';
  const accountRequired = params.kind === 'statement';

  const handleGenerate = () => {
    const problemKey = validateParams(params);
    if (problemKey) {
      setError(t(problemKey));
      setReport(null);
      return;
    }
    const outcome = attempt(() => buildReport(params), t('accounting.reports.generated'));
    if (outcome.ok) setReport(outcome.value);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <section className="space-y-5 xl:col-span-1">
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('accounting.reports.reportType')}</p>
          <div className="grid grid-cols-1 gap-2">
            {REPORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = params.kind === option.kind;
              return (
                <button
                  key={option.kind}
                  type="button"
                  onClick={() => update({ kind: option.kind })}
                  aria-pressed={selected}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-150 ${
                    selected
                      ? 'border-primary-500 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/30'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <Icon size={18} className={selected ? 'mt-0.5 text-primary-700 dark:text-primary-400' : 'mt-0.5 text-neutral-500'} />
                  <span>
                    <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {t(`accounting.reports.types.${option.kind}.label`)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {t(`accounting.reports.types.${option.kind}.description`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {usesAccount ? (
            <Field
              label={accountRequired ? t('fields.account') : t('accounting.reports.accountOptional')}
              htmlFor="accountingReportAccount"
            >
              <SelectInput
                id="accountingReportAccount"
                value={params.accountId}
                onChange={(event) => update({ accountId: event.target.value })}
              >
                <option value="">
                  {accountRequired ? t('accounting.reports.selectAccount') : t('accounting.ledger.allAccounts')}
                </option>
                {summaries.map((summary) => (
                  <option key={summary.account.id} value={summary.account.id}>
                    {summary.account.code} {accountDisplayName(summary.account)}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : null}

          {usesRange ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field label={t('accounting.journal.from')} htmlFor="accountingReportFrom">
                <TextInput id="accountingReportFrom" type="date" value={params.from} onChange={(event) => update({ from: event.target.value })} />
              </Field>
              <Field label={t('accounting.journal.to')} htmlFor="accountingReportTo">
                <TextInput id="accountingReportTo" type="date" value={params.to} onChange={(event) => update({ to: event.target.value })} />
              </Field>
            </div>
          ) : (
            <Field label={t('accounting.reports.asOf')} htmlFor="accountingReportAsOf" hint={t('accounting.reports.asOfHint')}>
              <TextInput id="accountingReportAsOf" type="date" value={params.to} onChange={(event) => update({ to: event.target.value })} />
            </Field>
          )}

          {error ? (
            <p role="alert" className="flex items-center gap-2 text-sm font-medium text-error-700 dark:text-error-500">
              <AlertTriangle size={16} />
              {error}
            </p>
          ) : null}

          <Button className="w-full" icon={<FileText size={16} />} onClick={handleGenerate}>
            {t('actions.generate')}
          </Button>
        </div>
      </section>

      <section className="min-w-0 xl:col-span-2">
        {report ? (
          <>
            <ReportActions report={report} />
            <ReportPreview report={report} />
          </>
        ) : (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 px-6 py-12 text-center dark:border-neutral-700">
            <FileText size={32} className="text-neutral-400" />
            <p className="mt-3 text-base font-semibold text-neutral-800 dark:text-neutral-200">{t('accounting.reports.noReport')}</p>
            <p className="mt-1 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">{t('accounting.reports.noReportHint')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
