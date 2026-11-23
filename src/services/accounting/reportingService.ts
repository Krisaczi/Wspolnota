import i18n from '../../i18n';
import { findAccount, listAccounts } from '../../db/repositories/accountsRepo';
import { sumTotalsByPeriodAndAccount, sumTotalsInRange } from '../../db/repositories/journalEntriesRepo';
import { balanceOf } from '../../domain/accounting/balances';
import { ACCOUNT_CODES, DATE_RANGE_ALL, type DateRange } from '../../domain/accounting/types';
import { accountDisplayName, accountTypeLabel } from '../../lib/accountLabels';
import { AppError } from '../../lib/errors';
import { roundMoney } from '../../lib/money';
import { formatDate, formatPeriod, shiftPeriod } from '../../lib/periods';
import { createReportContext, money, type ReportContext } from '../reports/reportContext';
import type { ReportCell, ReportDocument, ReportTable } from '../reports/types';
import { calculateLedger, calculateOpeningBalances } from './balanceCalculationService';

function rangeLabel(range: DateRange): string {
  return i18n.t('reports.rangeLabel', { from: formatDate(range.from), to: formatDate(range.to) });
}

function fileSuffix(range: DateRange): string {
  return `${range.from}_${range.to}`;
}

function monthsBetween(range: DateRange): string[] {
  const months: string[] = [];
  let current = range.from.slice(0, 7);
  const last = range.to.slice(0, 7);
  while (current <= last && months.length < 240) {
    months.push(current);
    current = shiftPeriod(current, 1);
  }
  return months;
}

function document(
  context: ReportContext,
  base: Omit<ReportDocument, 'generatedAt' | 'subtitle'> & { subtitle: string },
): ReportDocument {
  return { ...base, subtitle: `${base.subtitle} - ${context.communityName}`, generatedAt: context.generatedAt };
}

export function buildTrialBalance(asOf: string): ReportDocument {
  const context = createReportContext();
  const totals = new Map(sumTotalsInRange({ from: DATE_RANGE_ALL.from, to: asOf }).map((row) => [row.accountId, row]));
  const rows: ReportCell[][] = [];
  let debitTotal = 0;
  let creditTotal = 0;

  for (const account of listAccounts()) {
    const total = totals.get(account.id);
    if (!total) continue;
    const debit = roundMoney(total.debit);
    const credit = roundMoney(total.credit);
    debitTotal += debit;
    creditTotal += credit;
    rows.push([
      account.code,
      accountNameFor(account.code, account.name),
      accountTypeLabel(account.type),
      debit,
      credit,
      balanceOf(account.type, debit, credit),
    ]);
  }
  debitTotal = roundMoney(debitTotal);
  creditTotal = roundMoney(creditTotal);

  return document(context, {
    title: i18n.t('reports.titles.trialBalance'),
    subtitle: i18n.t('reports.asOf', { date: formatDate(asOf) }),
    fileName: `trial-balance-${asOf}`,
    summary: [
      { label: i18n.t('reports.labels.totalDebits'), value: money(debitTotal, context) },
      { label: i18n.t('reports.labels.totalCredits'), value: money(creditTotal, context) },
      {
        label: i18n.t('reports.labels.status'),
        value: debitTotal === creditTotal ? i18n.t('reports.labels.balanced') : i18n.t('reports.labels.outOfBalance'),
      },
    ],
    tables: [
      {
        heading: i18n.t('reports.headings.accounts'),
        columns: [
          i18n.t('reports.columns.code'),
          i18n.t('reports.columns.account'),
          i18n.t('reports.columns.type'),
          i18n.t('reports.columns.debits'),
          i18n.t('reports.columns.credits'),
          i18n.t('reports.columns.balance'),
        ],
        rows,
      },
    ],
  });
}

export function buildGeneralLedger(range: DateRange, accountId: number | null): ReportDocument {
  const context = createReportContext();
  const lines = calculateLedger(range, accountId);
  const debitTotal = roundMoney(lines.reduce((sum, line) => sum + line.debitAmount, 0));
  const creditTotal = roundMoney(lines.reduce((sum, line) => sum + line.creditAmount, 0));
  const accountName =
    accountId === null
      ? i18n.t('reports.allAccounts')
      : (findAccount(accountId)?.name ?? i18n.t('reports.columns.account'));

  return document(context, {
    title: i18n.t('reports.titles.generalLedger'),
    subtitle: `${accountName}, ${rangeLabel(range)}`,
    fileName: `general-ledger-${fileSuffix(range)}`,
    summary: [
      { label: i18n.t('reports.labels.lines'), value: String(lines.length) },
      { label: i18n.t('reports.labels.totalDebits'), value: money(debitTotal, context) },
      { label: i18n.t('reports.labels.totalCredits'), value: money(creditTotal, context) },
    ],
    tables: [
      {
        heading: i18n.t('reports.headings.transactions'),
        columns: [
          i18n.t('fields.date'),
          i18n.t('reports.columns.code'),
          i18n.t('reports.columns.account'),
          i18n.t('fields.description'),
          i18n.t('reports.columns.debit'),
          i18n.t('reports.columns.credit'),
          i18n.t('reports.columns.runningBalance'),
        ],
        rows: lines.map((line) => [
          formatDate(line.entryDate),
          line.accountCode,
          accountNameFor(line.accountCode, line.accountName),
          line.description,
          line.debitAmount,
          line.creditAmount,
          line.runningBalance,
        ]),
      },
    ],
  });
}

export function buildAccountStatement(accountId: number, range: DateRange): ReportDocument {
  const context = createReportContext();
  const account = findAccount(accountId);
  if (!account) throw new AppError(i18n.t('errors.accountMissing'));

  const opening = calculateOpeningBalances(range.from).get(accountId) ?? 0;
  const lines = calculateLedger(range, accountId);
  const closing = lines.length > 0 ? lines[lines.length - 1].runningBalance : opening;

  return document(context, {
    title: i18n.t('reports.titles.accountStatement'),
    subtitle: `${account.code} ${accountNameFor(account.code, account.name)}, ${rangeLabel(range)}`,
    fileName: `account-statement-${account.code}-${fileSuffix(range)}`,
    summary: [
      { label: i18n.t('reports.labels.accountType'), value: accountTypeLabel(account.type) },
      { label: i18n.t('reports.labels.openingBalance'), value: money(opening, context) },
      { label: i18n.t('reports.labels.closingBalance'), value: money(closing, context) },
    ],
    tables: [
      {
        heading: i18n.t('reports.headings.movements'),
        columns: [
          i18n.t('fields.date'),
          i18n.t('fields.description'),
          i18n.t('reports.columns.debit'),
          i18n.t('reports.columns.credit'),
          i18n.t('reports.columns.runningBalance'),
        ],
        rows: lines.map((line) => [
          formatDate(line.entryDate),
          line.description,
          line.debitAmount,
          line.creditAmount,
          line.runningBalance,
        ]),
      },
    ],
  });
}

function accountTurnoverReport(range: DateRange, type: 'EXPENSE' | 'INCOME'): ReportDocument {
  const context = createReportContext();
  const totals = new Map(sumTotalsInRange(range).map((row) => [row.accountId, row]));
  const accounts = listAccounts().filter((account) => account.type === type);
  const rows: ReportCell[][] = [];
  let netTotal = 0;

  for (const account of accounts) {
    const total = totals.get(account.id);
    if (!total) continue;
    const debit = roundMoney(total.debit);
    const credit = roundMoney(total.credit);
    const net = balanceOf(type, debit, credit);
    netTotal += net;
    rows.push([account.code, accountNameFor(account.code, account.name), debit, credit, net]);
  }

  const isExpense = type === 'EXPENSE';
  return document(context, {
    title: isExpense ? i18n.t('reports.titles.expenseSummary') : i18n.t('reports.titles.incomeSummary'),
    subtitle: rangeLabel(range),
    fileName: `${isExpense ? 'expense' : 'income'}-summary-${fileSuffix(range)}`,
    summary: [
      {
        label: isExpense ? i18n.t('reports.labels.totalExpenses') : i18n.t('reports.labels.totalIncome'),
        value: money(roundMoney(netTotal), context),
      },
    ],
    tables: [
      {
        heading: isExpense ? i18n.t('reports.headings.expensesByAccount') : i18n.t('reports.headings.incomeByAccount'),
        columns: [
          i18n.t('reports.columns.code'),
          i18n.t('reports.columns.account'),
          i18n.t('reports.columns.debits'),
          i18n.t('reports.columns.credits'),
          i18n.t('reports.columns.net'),
        ],
        rows,
      },
    ],
  });
}

export function buildExpenseSummary(range: DateRange): ReportDocument {
  return accountTurnoverReport(range, 'EXPENSE');
}

export function buildIncomeSummary(range: DateRange): ReportDocument {
  return accountTurnoverReport(range, 'INCOME');
}

export function buildMonthlyProfitAndLoss(range: DateRange): ReportDocument {
  const context = createReportContext();
  const totals = sumTotalsByPeriodAndAccount(range);
  const rows: ReportCell[][] = monthsBetween(range).map((period) => {
    const monthly = totals.filter((row) => row.period === period);
    const income = roundMoney(
      monthly.filter((row) => row.accountType === 'INCOME').reduce((sum, row) => sum + balanceOf('INCOME', row.debit, row.credit), 0),
    );
    const expenses = roundMoney(
      monthly.filter((row) => row.accountType === 'EXPENSE').reduce((sum, row) => sum + balanceOf('EXPENSE', row.debit, row.credit), 0),
    );
    return [formatPeriod(period), income, expenses, roundMoney(income - expenses)];
  });
  const netTotal = roundMoney(rows.reduce((sum, row) => sum + Number(row[3]), 0));

  return document(context, {
    title: i18n.t('reports.titles.monthlyProfitLoss'),
    subtitle: rangeLabel(range),
    fileName: `profit-and-loss-${fileSuffix(range)}`,
    summary: [{ label: i18n.t('reports.labels.netResultForPeriod'), value: money(netTotal, context) }],
    tables: [
      {
        heading: i18n.t('reports.headings.months'),
        columns: [
          i18n.t('reports.columns.month'),
          i18n.t('reports.columns.income'),
          i18n.t('reports.columns.expenses'),
          i18n.t('reports.columns.netResult'),
        ],
        rows,
      },
    ],
  });
}

export function buildCashMovement(range: DateRange): ReportDocument {
  const context = createReportContext();
  const cashCodes: string[] = [ACCOUNT_CODES.BANK, ACCOUNT_CODES.CASH];
  const totals = sumTotalsByPeriodAndAccount(range).filter((row) => cashCodes.includes(row.accountCode));
  const rows: ReportCell[][] = totals.map((row) => {
    const inflow = roundMoney(row.debit);
    const outflow = roundMoney(row.credit);
    return [formatPeriod(row.period), accountNameFor(row.accountCode, row.accountName), inflow, outflow, roundMoney(inflow - outflow)];
  });
  const table: ReportTable = {
    heading: i18n.t('reports.headings.cashMovements'),
    columns: [
      i18n.t('reports.columns.month'),
      i18n.t('reports.columns.account'),
      i18n.t('reports.columns.inflows'),
      i18n.t('reports.columns.outflows'),
      i18n.t('reports.columns.netMovement'),
    ],
    rows,
  };
  const netTotal = roundMoney(totals.reduce((sum, row) => sum + row.debit - row.credit, 0));

  return document(context, {
    title: i18n.t('reports.titles.cashMovement'),
    subtitle: rangeLabel(range),
    fileName: `cash-movement-${fileSuffix(range)}`,
    summary: [{ label: i18n.t('reports.labels.netCashMovement'), value: money(netTotal, context) }],
    tables: [table],
  });
}

function accountNameFor(code: string, name: string): string {
  return accountDisplayName({ code, name });
}
