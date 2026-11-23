import { create } from 'zustand';
import {
  deleteMeterType,
  deleteReading,
  insertMeterType,
  insertReading,
  listLatestReadingSummaries,
  listMeterTypes,
  listReadings,
  meterBalancesByApartment,
  updateMeterType,
  updateReading,
  type ApartmentMeterSummary,
  type MeterReadingInput,
} from '../db/repositories/metersRepo';
import type { MeterType, ReadingView } from '../domain/types';

interface ReadingSeries {
  apartmentId: number;
  meterTypeId: number;
}

interface MetersState {
  meterTypes: MeterType[];
  latestSummaries: ApartmentMeterSummary[];
  meterBalances: Map<number, number>;
  series: ReadingSeries | null;
  readings: ReadingView[];
  refreshMeterTypes: () => void;
  selectSeries: (series: ReadingSeries | null) => void;
  saveReading: (input: MeterReadingInput, id: number | null) => void;
  removeReading: (id: number) => void;
  saveMeterType: (name: string, id: number | null) => void;
  removeMeterType: (id: number) => void;
}

export const useMetersStore = create<MetersState>()((set, get) => {
  const reloadReadings = () => {
    const { series } = get();
    set({ readings: series ? listReadings(series.apartmentId, series.meterTypeId) : [] });
  };

  const reloadSummaries = () => set({ latestSummaries: listLatestReadingSummaries() });

  return {
    meterTypes: [],
    latestSummaries: [],
    meterBalances: new Map<number, number>(),
    series: null,
    readings: [],
    refreshMeterTypes: () => {
      set({ meterTypes: listMeterTypes(), meterBalances: meterBalancesByApartment() });
      reloadSummaries();
    },
    selectSeries: (series) => {
      set({ series });
      reloadReadings();
    },
    saveReading: (input, id) => {
      if (id === null) insertReading(input);
      else updateReading(id, input);
      reloadReadings();
      reloadSummaries();
      set({ meterBalances: meterBalancesByApartment() });
    },
    removeReading: (id) => {
      deleteReading(id);
      reloadReadings();
      reloadSummaries();
      set({ meterBalances: meterBalancesByApartment() });
    },
    saveMeterType: (name, id) => {
      if (id === null) insertMeterType(name);
      else updateMeterType(id, name);
      get().refreshMeterTypes();
    },
    removeMeterType: (id) => {
      deleteMeterType(id);
      get().refreshMeterTypes();
    },
  };
});
