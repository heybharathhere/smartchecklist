import { Modal } from '@/components/ui/Modal';
import { SHORTCUTS } from '@/hooks/useShortcuts';
import { useUI } from '@/store/useUI';

export function ShortcutsHelp() {
  const open = useUI((state) => state.shortcutsOpen);
  const setOpen = useUI((state) => state.setShortcutsOpen);

  const groups = ['Actions', 'Navigation', 'View'] as const;

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Keyboard shortcuts"
      description="Shortcuts are ignored while you are typing in a field."
      size="lg"
    >
      <div className="grid gap-6 sm:grid-cols-3">
        {groups.map((group) => (
          <section key={group}>
            <h3 className="mb-2 text-sm font-semibold text-limestone">{group}</h3>
            <ul className="space-y-1.5">
              {SHORTCUTS.filter((shortcut) => shortcut.group === group).map((shortcut) => (
                <li key={shortcut.keys} className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-steel">{shortcut.description}</span>
                  <span className="flex shrink-0 gap-1">
                    {shortcut.keys.split(' ').map((key) => (
                      <kbd
                        key={key}
                        className="rounded-[6px] border bg-steel/10 px-1.5 py-0.5 text-2xs text-limestone"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
