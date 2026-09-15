import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Check, FolderInput, Flag, RotateCcw, Trash2, X } from 'lucide-react';
import { addDays, toISO } from '@/lib/date';
import { PRIORITIES } from '@/lib/palette';
import { Button } from '@/components/ui/primitives';
import { Menu } from '@/components/ui/Menu';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import { useToasts } from '@/store/useToasts';
import { useUI } from '@/store/useUI';

export function BulkBar() {
  const selection = useUI((state) => state.selection);
  const clearSelection = useUI((state) => state.clearSelection);
  const checklists = useData((state) => state.checklists);
  const bulkComplete = useData((state) => state.bulkComplete);
  const bulkDelete = useData((state) => state.bulkDelete);
  const bulkPriority = useData((state) => state.bulkPriority);
  const bulkDue = useData((state) => state.bulkDue);
  const bulkMove = useData((state) => state.bulkMove);
  const confirmDelete = usePrefs((state) => state.confirmDelete);
  const push = useToasts((state) => state.push);

  const count = selection.length;

  const run = async (action: () => Promise<void>, message: string) => {
    await action();
    push(message, { tone: 'success' });
    clearSelection();
  };

  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="no-print fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-1.5 overflow-x-auto rounded-full border px-2 py-1.5 glass shadow-float lg:bottom-6"
        >
          <span className="tabular shrink-0 px-2 text-sm text-limestone">{count} selected</span>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => void run(() => bulkComplete(selection, true), `Completed ${count} tasks.`)}
          >
            <Check size={15} />
            Complete
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => void run(() => bulkComplete(selection, false), `Reopened ${count} tasks.`)}
          >
            <RotateCcw size={14} />
            Reopen
          </Button>

          <Menu
            label="Set priority"
            align="left"
            items={PRIORITIES.map((option) => ({
              label: option.label,
              onSelect: () =>
                void run(() => bulkPriority(selection, option.key), `Set ${count} tasks to ${option.label}.`),
            }))}
            trigger={({ toggle }) => (
              <Button size="sm" variant="ghost" onClick={toggle}>
                <Flag size={14} />
                Priority
              </Button>
            )}
          />

          <Menu
            label="Set due date"
            align="left"
            items={[
              { label: 'Today', onSelect: () => void run(() => bulkDue(selection, toISO(new Date())), 'Due today.') },
              {
                label: 'Tomorrow',
                onSelect: () => void run(() => bulkDue(selection, toISO(addDays(new Date(), 1))), 'Due tomorrow.'),
              },
              {
                label: 'Next week',
                onSelect: () => void run(() => bulkDue(selection, toISO(addDays(new Date(), 7))), 'Due next week.'),
              },
              { label: 'Clear due date', onSelect: () => void run(() => bulkDue(selection, null), 'Due dates cleared.'), separated: true },
            ]}
            trigger={({ toggle }) => (
              <Button size="sm" variant="ghost" onClick={toggle}>
                <Calendar size={14} />
                Due
              </Button>
            )}
          />

          <Menu
            label="Move to checklist"
            align="left"
            items={checklists
              .filter((list) => !list.archived)
              .map((list) => ({
                label: list.title,
                onSelect: () => void run(() => bulkMove(selection, list.id), `Moved to ${list.title}.`),
              }))}
            trigger={({ toggle }) => (
              <Button size="sm" variant="ghost" onClick={toggle}>
                <FolderInput size={14} />
                Move
              </Button>
            )}
          />

          <Button
            size="sm"
            variant="ghost"
            className="text-critical hover:bg-critical/12"
            onClick={() => {
              if (confirmDelete && !window.confirm(`Delete ${count} tasks and their subtasks?`)) return;
              void bulkDelete(selection).then(() => {
                const undo = useData.getState().undo;
                push(`Deleted ${count} tasks.`, { tone: 'danger', undo: undo ? () => void undo.run() : undefined });
                clearSelection();
              });
            }}
          >
            <Trash2 size={14} />
            Delete
          </Button>

          <Button size="sm" variant="ghost" onClick={clearSelection} aria-label="Clear selection">
            <X size={15} />
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
