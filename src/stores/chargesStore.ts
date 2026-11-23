import { create } from 'zustand';
import {
  deleteChargeType,
  insertChargeType,
  listChargeTypes,
  updateChargeType,
  type ChargeTypeInput,
} from '../db/repositories/chargeTypesRepo';
import type { ChargeType } from '../domain/types';

interface ChargesState {
  chargeTypes: ChargeType[];
  refresh: () => void;
  save: (input: ChargeTypeInput, id: number | null) => void;
  remove: (id: number) => void;
}

export const useChargesStore = create<ChargesState>()((set, get) => ({
  chargeTypes: [],
  refresh: () => set({ chargeTypes: listChargeTypes() }),
  save: (input, id) => {
    if (id === null) insertChargeType(input);
    else updateChargeType(id, input);
    get().refresh();
  },
  remove: (id) => {
    deleteChargeType(id);
    get().refresh();
  },
}));
