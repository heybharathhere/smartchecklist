import { create } from 'zustand';
import { EMPTY_FILTER } from '@/lib/tasks';
import type { FilterState, ViewMode } from '@/types';

interface UIState {
  commandOpen: boolean;
  quickAddOpen: boolean;
  shortcutsOpen: boolean;
  focusMode: boolean;
  /** Task id being edited in the task dialog, or 'new' for a blank one. */
  editingTaskId: string | null;
  filter: FilterState;
  view: ViewMode | null;
  selection: string[];
  collapsed: string[];

  setCommandOpen: (open: boolean) => void;
  setQuickAddOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  toggleFocusMode: () => void;
  setEditingTask: (id: string | null) => void;
  setFilter: (patch: Partial<FilterState>) => void;
  applyFilter: (filter: FilterState) => void;
  resetFilter: () => void;
  setView: (view: ViewMode | null) => void;
  toggleSelected: (id: string) => void;
  selectMany: (ids: string[]) => void;
  clearSelection: () => void;
  toggleCollapsed: (id: string) => void;
  collapseAll: (ids: string[]) => void;
  expandAll: () => void;
}

export const useUI = create<UIState>((set, get) => ({
  commandOpen: false,
  quickAddOpen: false,
  shortcutsOpen: false,
  focusMode: false,
  editingTaskId: null,
  filter: { ...EMPTY_FILTER },
  view: null,
  selection: [],
  collapsed: [],

  setCommandOpen: (open) => set({ commandOpen: open }),
  setQuickAddOpen: (open) => set({ quickAddOpen: open }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  toggleFocusMode: () => set({ focusMode: !get().focusMode }),
  setEditingTask: (id) => set({ editingTaskId: id }),
  setFilter: (patch) => set({ filter: { ...get().filter, ...patch } }),
  applyFilter: (filter) => set({ filter: { ...filter } }),
  resetFilter: () => set({ filter: { ...EMPTY_FILTER } }),
  setView: (view) => set({ view }),
  toggleSelected: (id) =>
    set({
      selection: get().selection.includes(id)
        ? get().selection.filter((s) => s !== id)
        : [...get().selection, id],
    }),
  selectMany: (ids) => set({ selection: ids }),
  clearSelection: () => set({ selection: [] }),
  toggleCollapsed: (id) =>
    set({
      collapsed: get().collapsed.includes(id)
        ? get().collapsed.filter((c) => c !== id)
        : [...get().collapsed, id],
    }),
  collapseAll: (ids) => set({ collapsed: ids }),
  expandAll: () => set({ collapsed: [] }),
}));
