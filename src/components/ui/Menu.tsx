import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Renders a divider above this item. */
  separated?: boolean;
}

export function Menu({
  trigger,
  items,
  align = 'right',
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      const enabled = items.map((item, index) => ({ item, index })).filter(({ item }) => !item.disabled);
      if (!enabled.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const position = enabled.findIndex(({ index }) => index === active);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const next = (position + step + enabled.length) % enabled.length;
        setActive(enabled[next].index);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const item = items[active];
        if (item && !item.disabled) {
          setOpen(false);
          item.onSelect();
        }
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, items, active]);

  return (
    <div className="relative" ref={root}>
      {trigger({
        open,
        toggle: () => {
          setActive(items.findIndex((item) => !item.disabled));
          setOpen((value) => !value);
        },
      })}
      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'panel absolute z-40 mt-1.5 min-w-[11.5rem] overflow-hidden p-1 shadow-float',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item, index) => (
              <div key={item.label}>
                {item.separated ? <div className="my-1 border-t" /> : null}
                <button
                  role="menuitem"
                  disabled={item.disabled}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-40',
                    item.danger ? 'text-critical' : 'text-limestone',
                    index === active && !item.disabled && (item.danger ? 'bg-critical/12' : 'bg-steel/12'),
                  )}
                >
                  {item.icon ? <span className="text-steel">{item.icon}</span> : null}
                  {item.label}
                </button>
              </div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
