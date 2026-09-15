import { AnimatePresence, motion } from 'framer-motion';
import { Check, SkipForward, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, EmptyState } from '@/components/ui/primitives';
import { Pomodoro } from '@/components/focus/Pomodoro';
import { relativeDay } from '@/lib/date';
import { priority as prioritySpec } from '@/lib/palette';
import { smartScore } from '@/lib/tasks';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import { useUI } from '@/store/useUI';

export function FocusMode() {
  const active = useUI((state) => state.focusMode);
  const toggle = useUI((state) => state.toggleFocusMode);
  const checklists = useData((state) => state.checklists);
  const tasks = useData((state) => state.tasks);
  const toggleTask = useData((state) => state.toggleTask);
  const dateFormat = usePrefs((state) => state.dateFormat);
  const [skipped, setSkipped] = useState<string[]>([]);

  const archived = useMemo(
    () => new Set(checklists.filter((list) => list.archived).map((list) => list.id)),
    [checklists],
  );

  const queue = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed && !archived.has(task.checklistId) && !skipped.includes(task.id))
        .sort((a, b) => smartScore(a) - smartScore(b)),
    [tasks, archived, skipped],
  );

  const current = queue[0];
  const listTitle = checklists.find((list) => list.id === current?.checklistId)?.title;

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col bg-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-sm text-steel">
              Focus mode · {queue.length} {queue.length === 1 ? 'task' : 'tasks'} left
            </p>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Leave focus mode">
              <X size={18} />
            </Button>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 pb-10">
            {current ? (
              <div className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
                <Pomodoro />
                <div>
                  <p className="text-sm text-steel">{listTitle}</p>
                  <h1 className="mt-1.5 font-display text-2xl leading-snug text-limestone sm:text-3xl">
                    {current.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                    <Badge
                      className={prioritySpec(current.priority).className}
                      dot={prioritySpec(current.priority).dot}
                    >
                      {prioritySpec(current.priority).label}
                    </Badge>
                    {current.dueDate ? (
                      <Badge className="border-hairline text-steel">
                        {relativeDay(current.dueDate, dateFormat)}
                      </Badge>
                    ) : null}
                  </div>
                  {current.notes ? (
                    <p className="mx-auto mt-4 max-w-md whitespace-pre-wrap text-sm leading-relaxed text-steel">
                      {current.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="primary" size="lg" onClick={() => void toggleTask(current.id, true)}>
                    <Check size={17} />
                    Mark done
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setSkipped((list) => [...list, current.id])}
                  >
                    <SkipForward size={16} />
                    Later
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Nothing left in the queue"
                body="Every open task is either done or set aside. Leave focus mode to plan what comes next."
                action={
                  <div className="flex gap-2">
                    {skipped.length ? (
                      <Button onClick={() => setSkipped([])}>Bring back set-aside tasks</Button>
                    ) : null}
                    <Button variant="primary" onClick={toggle}>
                      Leave focus mode
                    </Button>
                  </div>
                }
              />
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
