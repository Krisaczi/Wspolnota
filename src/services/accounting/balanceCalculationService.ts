import { listAccounts } from '../../db/repositories/accountsRepo';
import { listLedgerLines, sumTotalsInRange } from '../../db/repositories/journalEntriesRepo';
import { balanceOf } from '../../domain/accounting/balances';
import { ACCOUNT_CODES, DATE_RANGE_ALL, type Account, type DateRange, type LedgerLine } from '../../domain/accounting/types';
import { roundMoney } from '../../lib/money';
import { addDays, periodDateRange } from '../../lib/periods';

export interface AccountSummary {
  account: Account;
  totalDebits: number;
  totalCredits: number;
  balance: number;
  periodDebits: number;
  periodCredits: number;
  periodTurnover: number;
}

export interface DashboardMetrics {
  bankBalance: number;
  cashBalance: number;
  receivables: number;
  payables: number;
  monthlyExpenses: number;
  monthlyIncome: number;
  netResult: number;
}

interface Totals {
  debit: number;
  credit: number;
}

const NO_TOTALS: Totals = { debit: 0, credit: 0 };

function indexTotals(range: DateRange): Map<number, Totals> {
  return new Map(
    sumTotalsInRange(range).map((row) => [row.accountId, { debit: roundMoney(row.debit), credit: roundMoney(row.credit) }]),
  );
}

export function calculateAccountSummaries(asOf: string, period: DateRange): AccountSummary[] {
  const allTime = indexTotals({ from: DATE_RANGE_ALL.from, to: asOf });
  const inPeriod = indexTotals(period);

  return listAccounts().map((account) => {
    const total = allTime.get(account.id) ?? NO_TOTALS;
    const movement = inPeriod.get(account.id) ?? NO_TOTALS;
    const opening = openingBalanceUpTo(account, asOf);
    return {
      account,
      totalDebits: roundMoney(total.debit + opening),
      totalCredits: total.credit,
      balance: roundMoney(balanceOf(account.type, total.debit, total.credit) + opening),
      periodDebits: movement.debit,
      periodCredits: movement.credit,
      periodTurnover: balanceOf(account.type, movement.debit, movement.credit),
    };
  });
}

/** The account's opening balance once its date has passed, or zero before it / when unset. */
export function openingBalanceUpTo(account: Account, asOf: string): number {
  if (account.openingBalance === 0) return 0;
  if (!account.openingBalanceDate) return 0;
  return account.openingBalanceDate <= asOf ? account.openingBalance : 0;
}

export function calculateOpeningBalances(from: string): Map<number, number> {
  const totals = indexTotals({ from: DATE_RANGE_ALL.from, to: addDays(from, -1) });
  return new Map(
    listAccounts().map((account) => {
      const total = totals.get(account.id) ?? NO_TOTALS;
      return [account.id, roundMoney(balanceOf(account.type, total.debit, total.credit) + openingBalanceUpTo(account, addDays(from, -1)))];
    }),
  );
}

export function calculateLedger(range: DateRange, accountId: number | null): LedgerLine[] {
  const running = calculateOpeningBalances(range.from);
  return listLedgerLines(range, accountId).map((line) => {
    const next = roundMoney((running.get(line.accountId) ?? 0) + balanceOf(line.accountType, line.debitAmount, line.creditAmount));
    running.set(line.accountId, next);
    return { ...line, runningBalance: next };
  });
}

export function calculateDashboardMetrics(period: string): DashboardMetrics {
  const range = periodDateRange(period);
  const summaries = calculateAccountSummaries(DATE_RANGE_ALL.to, range);
  const byCode = new Map(summaries.map((summary) => [summary.account.code, summary]));
  const balanceOfCode = (code: string) => byCode.get(code)?.balance ?? 0;
  const turnoverOfType = (type: Account['type']) =>
    roundMoney(
      summaries.filter((summary) => summary.account.type === type).reduce((sum, summary) => sum + summary.periodTurnover, 0),
    );

  const monthlyExpenses = turnoverOfType('EXPENSE');
  const monthlyIncome = turnoverOfType('INCOME');
  return {
    bankBalance: balanceOfCode(ACCOUNT_CODES.BANK),
    cashBalance: balanceOfCode(ACCOUNT_CODES.CASH),
    receivables: balanceOfCode(ACCOUNT_CODES.RECEIVABLES),
    payables: balanceOfCode(ACCOUNT_CODES.SUPPLIER_PAYABLES),
    monthlyExpenses,
    monthlyIncome,
    netResult: roundMoney(monthlyIncome - monthlyExpenses),
  };
}
