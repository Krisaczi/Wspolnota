import { create } from 'zustand';
import { listOtherIncome } from '../db/repositories/otherIncomeRepo';
import { removeOtherIncomeWithPosting, saveOtherIncomeWithPosting } from '../services/accounting/otherIncomePosting';
import type { OtherIncomeEntry, OtherIncomeInput } from '../domain/accounting/types';

interface OtherIncomeState {
  entries: OtherIncomeEntry[];
  refresh: () => void;
  save: (input: OtherIncomeInput, id: number | null) => void;
  remove: (id: number) => void;
}

export const useOtherIncomeStore = create<OtherIncomeState>()((set) => ({
  entries: [],
  refresh: () => set({ entries: listOtherIncome() }),
  save: (input, id) => {
    saveOtherIncomeWithPosting(input, id);
    set({ entries: listOtherIncome() });
  },
  remove: (id) => {
    removeOtherIncomeWithPosting(id);
    set({ entries: listOtherIncome() });
  },
}));
