import { create } from 'zustand';
import { openDatabase } from '../db/client';
import { toFriendlyMessage } from '../lib/errors';

type AppStatus = 'loading' | 'ready' | 'error';

interface AppState {
  status: AppStatus;
  errorMessage: string | null;
  initialize: () => Promise<void>;
}

let initialization: Promise<void> | null = null;

export const useAppStore = create<AppState>()((set) => ({
  status: 'loading',
  errorMessage: null,
  initialize: () => {
    initialization ??= openDatabase().then(
      () => set({ status: 'ready', errorMessage: null }),
      (error: unknown) => {
        initialization = null;
        set({ status: 'error', errorMessage: toFriendlyMessage(error) });
      },
    );
    return initialization;
  },
}));
