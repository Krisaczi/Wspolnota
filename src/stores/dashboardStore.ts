import { create } from 'zustand';
import { listApartments } from '../db/repositories/apartmentsRepo';
import { sumChargesByApartment } from '../db/repositories/monthlyChargesRepo';
import { listPayments } from '../db/repositories/paymentsRepo';
import { allocationSumsByApartment, receivablePaymentsByApartment } from '../db/repositories/paymentAllocationsRepo';
import { meterBalancesByApartment } from '../db/repositories/metersRepo';
import { calculateBalance, summarizeBalances, type BalanceSummary } from '../domain/balances';
import type { PaymentView } from '../domain/types';
import { currentPeriod } from '../lib/periods';
import { calculateDashboardMetrics, type DashboardMetrics } from '../services/accounting/balanceCalculationService';

const RECENT_PAYMENT_LIMIT = 8;

interface DashboardState {
  summary: BalanceSummary;
  accounting: DashboardMetrics;
  recentPayments: PaymentView[];
  refresh: () => void;
}

const EMPTY_SUMMARY: BalanceSummary = {
  apartmentCount: 0,
  receivables: 0,
  liabilities: 0,
  totalBalance: 0,
  debtorCount: 0,
};

const EMPTY_ACCOUNTING: DashboardMetrics = {
  bankBalance: 0,
  cashBalance: 0,
  receivables: 0,
  payables: 0,
  monthlyExpenses: 0,
  monthlyIncome: 0,
  netResult: 0,
};

export const useDashboardStore = create<DashboardState>()((set) => ({
  summary: EMPTY_SUMMARY,
  accounting: EMPTY_ACCOUNTING,
  recentPayments: [],
  refresh: () => {
    const charges = sumChargesByApartment();
    const meterBalances = meterBalancesByApartment();
    // Owner balances from allocated postings: settled categories (operating, meter, etc.) reduce
    // the outstanding balance; 'overpayment' allocations create owner credit.
    const receivablePaid = receivablePaymentsByApartment();
    const prepayments = allocationSumsByApartment(['overpayment']);
    const balances = listApartments().map((apartment) =>
      calculateBalance(
        (charges.get(apartment.id) ?? 0) + (meterBalances.get(apartment.id) ?? 0),
        receivablePaid.get(apartment.id) ?? 0,
        apartment.startingBalance,
      ) - (prepayments.get(apartment.id) ?? 0),
    );
    set({
      summary: summarizeBalances(balances),
      accounting: calculateDashboardMetrics(currentPeriod()),
      recentPayments: listPayments().slice(0, RECENT_PAYMENT_LIMIT),
    });
  },
}));
