import { roundMoney } from '../lib/money';

const DEBT_THRESHOLD = 0.005;

export interface BalanceSummary {
  apartmentCount: number;
  receivables: number;
  liabilities: number;
  totalBalance: number;
  debtorCount: number;
}

export function calculateBalance(totalCharges: number, totalPayments: number, startingBalance = 0): number {
  return roundMoney(totalCharges - totalPayments + startingBalance);
}

export function summarizeBalances(balances: number[]): BalanceSummary {
  let receivables = 0;
  let liabilities = 0;
  let debtorCount = 0;
  for (const balance of balances) {
    if (balance > DEBT_THRESHOLD) {
      receivables += balance;
      debtorCount += 1;
    } else if (balance < -DEBT_THRESHOLD) {
      liabilities += -balance;
    }
  }
  return {
    apartmentCount: balances.length,
    receivables: roundMoney(receivables),
    liabilities: roundMoney(liabilities),
    totalBalance: roundMoney(balances.reduce((sum, balance) => sum + balance, 0)),
    debtorCount,
  };
}

export function isDebt(balance: number): boolean {
  return balance > DEBT_THRESHOLD;
}
