import { create } from 'zustand';
import { DEFAULT_SETTINGS, readSettings, writeSettings } from '../db/repositories/settingsRepo';
import type { AppSettings } from '../domain/types';

interface SettingsState {
  settings: AppSettings;
  refresh: () => void;
  save: (patch: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: DEFAULT_SETTINGS,
  refresh: () => set({ settings: readSettings() }),
  save: (patch) => {
    const next = { ...get().settings, ...patch };
    writeSettings(next);
    set({ settings: next });
  },
}));
