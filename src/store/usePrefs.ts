import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DashboardWidget, Preferences } from '@/types';

export const PREFS_KEY = 'smart-checklist:prefs';

export const DEFAULT_PREFS: Preferences = {
  theme: 'system',
  highContrast: false,
  reduceMotion: false,
  dateFormat: 'd MMM yyyy',
  weekStartsOn: 1,
  defaultView: 'list',
  sidebarCollapsed: false,
  autoBackup: true,
  autoBackupKeep: 5,
  notifications: false,
  confirmDelete: true,
  pomodoroFocus: 25,
  pomodoroBreak: 5,
  pomodoroLongBreak: 15,
  widgets: {
    today: true,
    heatmap: true,
    upcoming: true,
    breakdown: true,
    activity: true,
    streak: true,
  },
};

interface PrefsState extends Preferences {
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  toggleWidget: (widget: DashboardWidget) => void;
  reset: () => void;
}

/**
 * Preferences live in LocalStorage (small, synchronous, read before first paint)
 * while all app data lives in IndexedDB.
 */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFS,
      set: (key, value) => set({ [key]: value } as Partial<PrefsState>),
      toggleWidget: (widget) =>
        set((state) => ({ widgets: { ...state.widgets, [widget]: !state.widgets[widget] } })),
      reset: () => set({ ...DEFAULT_PREFS }),
    }),
    {
      name: PREFS_KEY,
      version: 1,
      partialize: (state) => {
        const { set: _set, toggleWidget: _toggle, reset: _reset, ...rest } = state;
        return rest;
      },
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<PrefsState>),
        widgets: {
          ...DEFAULT_PREFS.widgets,
          ...((persisted as Partial<PrefsState>)?.widgets ?? {}),
        },
      }),
    },
  ),
);
