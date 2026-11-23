import { create } from 'zustand';
import { listPayments } from '../db/repositories/paymentsRepo';
import { removePayment, savePayment } from '../services/accounting/paymentPosting';
import type { PaymentInput } from '../db/repositories/paymentsRepo';
import type { PaymentView } from '../domain/types';

interface PaymentsState {
  payments: PaymentView[];
  refresh: () => void;
  save: (input: PaymentInput, id: number | null) => void;
  remove: (id: number) => void;
}

export const usePaymentsStore = create<PaymentsState>()((set, get) => ({
  payments: [],
  refresh: () => set({ payments: listPayments() }),
  save: (input, id) => {
    savePayment(input, id);
    get().refresh();
  },
  remove: (id) => {
    removePayment(id);
    get().refresh();
  },
}));
