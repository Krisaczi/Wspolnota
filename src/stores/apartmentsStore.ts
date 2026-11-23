import { create } from 'zustand';
import {
  deleteApartment,
  insertApartment,
  listApartments,
  updateApartment,
  type ApartmentInput,
} from '../db/repositories/apartmentsRepo';
import { sumChargesByApartment } from '../db/repositories/monthlyChargesRepo';
import { allocationSumsByApartment, receivablePaymentsByApartment } from '../db/repositories/paymentAllocationsRepo';
import { meterBalancesByApartment } from '../db/repositories/metersRepo';
import { calculateBalance } from '../domain/balances';
import { removeApartmentWithPosting, saveApartmentWithPosting } from '../services/accounting/startingBalancePosting';
import type { ApartmentView } from '../domain/types';

interface ApartmentsState {
  items: ApartmentView[];
  refresh: () => void;
  save: (input: ApartmentInput, id: number | null) => void;
  remove: (id: number) => void;
}

export const useApartmentsStore = create<ApartmentsState>()((set, get) => ({
  items: [],
  refresh: () => {
    const charges = sumChargesByApartment();
    const meterBalances = meterBalancesByApartment();
    // Same allocation-aware balance model as the dashboard.
    const receivablePaid = receivablePaymentsByApartment();
    const prepayments = allocationSumsByApartment(['overpayment']);
    set({
      items: listApartments().map((apartment) => ({
        ...apartment,
        balance:
          calculateBalance(
            (charges.get(apartment.id) ?? 0) + (meterBalances.get(apartment.id) ?? 0),
            receivablePaid.get(apartment.id) ?? 0,
            apartment.startingBalance,
          ) - (prepayments.get(apartment.id) ?? 0),
      })),
    });
  },
  save: (input, id) => {
    saveApartmentWithPosting(
      input,
      id,
      () => insertApartment(input),
      () => updateApartment(id as number, input),
    );
    get().refresh();
  },
  remove: (id) => {
    removeApartmentWithPosting(id, () => deleteApartment(id));
    get().refresh();
  },
}));
