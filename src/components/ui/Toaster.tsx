import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, AlertTriangle, Undo2, X } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useToasts } from '@/store/useToasts';

const TONE = {
  default: { icon: Info, className: 'text-steel' },
  success: { icon: Check, className: 'text-teal' },
  danger: { icon: AlertTriangle, className: 'text-critical' },
};

const LIFETIME = 6000;

function Toast({ id, message, tone, undo }: { id: string; message: string; tone: keyof typeof TONE; undo?: () => void }) {
  const dismiss = useToasts((state) => state.dismiss);
  const { icon: Icon, className } = TONE[tone];

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(id), LIFETIME);
    return () => window.clearTimeout(timer);
  }, [id, dismiss]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="panel pointer-events-auto flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 px-3.5 py-3 shadow-float"
    >
      <Icon size={16} className={cn('mt-0.5 shrink-0', className)} />
      <p className="min-w-0 flex-1 text-sm leading-snug text-limestone">{message}</p>
      {undo ? (
        <button
          onClick={() => {
            undo();
            dismiss(id);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-control px-1.5 py-0.5 text-sm font-medium text-copper hover:bg-copper/12"
        >
          <Undo2 size={13} />
          Undo
        </button>
      ) : null}
      <button
        onClick={() => dismiss(id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-control p-0.5 text-steel hover:text-limestone"
      >
        <X size={14} />
      </button>
    </motion.li>
  );
}

export function Toaster() {
  const toasts = useToasts((state) => state.toasts);
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-0 z-[60] flex flex-col items-end gap-2 px-4 sm:bottom-5 sm:px-5"
    >
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <Toast key={toast.id} id={toast.id} message={toast.message} tone={toast.tone} undo={toast.undo} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
