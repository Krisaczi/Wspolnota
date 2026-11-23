import { create } from 'zustand';
import { listChargesForPeriod } from '../db/repositories/monthlyChargesRepo';
import type { ChargeView } from '../domain/types';
import { generateBilling, removeBillingForPeriod, type BillingResult } from '../services/billingService';
import { currentPeriod } from '../lib/periods';

interface BillingState {
  period: string;
  charges: ChargeView[];
  setPeriod: (period: string) => void;
  refresh: () => void;
  generate: () => BillingResult;
  removeBilling: () => number;
}

export const useBillingStore = create<BillingState>()((set, get) => ({
  period: currentPeriod(),
  charges: [],
  setPeriod: (period) => {
    set({ period });
    get().refresh();
  },
  refresh: () => set({ charges: listChargesForPeriod(get().period) }),
  generate: () => {
    const result = generateBilling(get().period);
    get().refresh();
    return result;
  },
  removeBilling: () => {
    const removed = removeBillingForPeriod(get().period);
    get().refresh();
    return removed;
  },
}));
