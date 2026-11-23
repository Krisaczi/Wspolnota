import { create } from 'zustand';
import {
  deleteApartment,
  insertApartment,
  listApartments,
  updateApartment,
  type ApartmentInput,
} from '../db/repositories/apartmentsRepo';
import { sumChargesByApartment } from '../db/repositories/monthlyChargesRepo';
import { sumPaymentsByApartment } from '../db/repositories/paymentsRepo';
import { meterBalancesByApartment } from '../db/repositories/metersRepo';
import { calculateBalance } from '../domain/balances';
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
    const payments = sumPaymentsByApartment();
    const meterBalances = meterBalancesByApartment();
    set({
      items: listApartments().map((apartment) => ({
        ...apartment,
        balance: calculateBalance(
          (charges.get(apartment.id) ?? 0) + (meterBalances.get(apartment.id) ?? 0),
          payments.get(apartment.id) ?? 0,
          apartment.startingBalance,
        ),
      })),
    });
  },
  save: (input, id) => {
    if (id === null) insertApartment(input);
    else updateApartment(id, input);
    get().refresh();
  },
  remove: (id) => {
    deleteApartment(id);
    get().refresh();
  },
}));
