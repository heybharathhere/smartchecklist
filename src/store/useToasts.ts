import { create } from 'zustand';
import { uid } from '@/lib/id';
import type { Toast } from '@/types';

interface ToastState {
  toasts: Toast[];
  push: (message: string, options?: { tone?: Toast['tone']; undo?: () => void }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (message, options) => {
    const id = uid('t_');
    set((state) => ({
      toasts: [...state.toasts, { id, message, tone: options?.tone ?? 'default', undo: options?.undo }].slice(-4),
    }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Convenience for non-React callers. */
export const toast = (message: string, options?: { tone?: Toast['tone']; undo?: () => void }) =>
  useToasts.getState().push(message, options);
