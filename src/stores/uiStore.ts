import { create } from 'zustand';
import type { ModuleId } from '../app/navigation';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'hcm-theme';

function readInitialTheme(): Theme {
  return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

interface UiState {
  activeModule: ModuleId;
  theme: Theme;
  setActiveModule: (module: ModuleId) => void;
  setTheme: (theme: Theme) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  activeModule: 'dashboard',
  theme: readInitialTheme(),
  setActiveModule: (module) => set({ activeModule: module }),
  setTheme: (theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
}));

applyTheme(useUiStore.getState().theme);
