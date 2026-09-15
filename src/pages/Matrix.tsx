import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { relativeDay } from '@/lib/date';
import { priority as prioritySpec } from '@/lib/palette';
import { quadrantOf, taskMatches } from '@/lib/tasks';
import { Card, EmptyState } from '@/components/ui/primitives';
import { FilterBar } from '@/components/tasks/FilterBar';
import { TaskDialog, draftFromTask, type TaskDraft } from '@/components/tasks/TaskDialog';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import { useUI } from '@/store/useUI';
import type { Task } from '@/types';

const QUADRANTS = [
  { id: 1, title: 'Do now', body: 'Urgent and important', accent: 'border-critical/40 bg-critical/6' },
  { id: 2, title: 'Schedule', body: 'Important, not urgent', accent: 'border-medium/40 bg-medium/6' },
  { id: 3, title: 'Delegate', body: 'Urgent, less important', accent: 'border-high/40 bg-high/6' },
  { id: 4, title: 'Drop or defer', body: 'Neither urgent nor important', accent: 'border-hairline bg-steel/5' },
] as const;

export default function Matrix() {
  const checklists = useData((state) => state.checklists);
  const allTasks = useData((state) => state.tasks);
  const toggleTask = useData((state) => state.toggleTask);
  const dateFormat = usePrefs((state) => state.dateFormat);
  const filter = useUI((state) => state.filter);
  const [draft, setDraft] = useState<TaskDraft | null>(null);

  const buckets = useMemo(() => {
    const archived = new Set(checklists.filter((list) => list.archived).map((list) => list.id));
    const byList = new Map(checklists.map((list) => [list.id, list]));
    const map = new Map<number, Task[]>([[1, []], [2, []], [3, []], [4, []]]);
    for (const task of allTasks) {
      if (task.completed || archived.has(task.checklistId)) continue;
      if (!taskMatches(task, filter, byList.get(task.checklistId))) continue;
      map.get(quadrantOf(task))?.push(task);
    }
    return map;
  }, [allTasks, checklists, filter]);

  const total = Array.from(buckets.values()).reduce((sum, list) => sum + list.length, 0);
  const names = new Map(checklists.map((list) => [list.id, list.title]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl text-limestone">Priority matrix</h1>
        <p className="mt-0.5 text-sm text-steel">
          Open tasks split by urgency and importance. Due within two days counts as urgent;
          critical and high priority count as important.
        </p>
      </div>

      <FilterBar showCategories />

      {total === 0 ? (
        <EmptyState
          title="Nothing open to sort"
          body="Every task is either done or filtered out. Clear the filters to see the full picture."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {QUADRANTS.map((quadrant) => {
            const tasks = buckets.get(quadrant.id) ?? [];
            return (
              <Card key={quadrant.id} className={cn('p-4', quadrant.accent)}>
                <header className="mb-3">
                  <h2 className="font-display text-base text-limestone">
                    {quadrant.title}
                    <span className="tabular ml-2 text-sm font-normal text-steel">{tasks.length}</span>
                  </h2>
                  <p className="text-2xs text-steel">{quadrant.body}</p>
                </header>
                {tasks.length === 0 ? (
                  <p className="py-4 text-sm text-steel">Nothing here.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {tasks.slice(0, 12).map((task) => (
                      <li key={task.id} className="flex items-start gap-2.5">
                        <button
                          onClick={() => void toggleTask(task.id, true)}
                          aria-label={`Mark ${task.title} done`}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded-[6px] border border-steel/50 hover:border-teal hover:bg-teal/20"
                        />
                        <button
                          onClick={() => setDraft(draftFromTask(task))}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-sm text-limestone">{task.title}</span>
                          <span className="block truncate text-2xs text-steel">
                            {names.get(task.checklistId)}
                            {task.dueDate ? ` · ${relativeDay(task.dueDate, dateFormat)}` : ''}
                            {` · ${prioritySpec(task.priority).label}`}
                          </span>
                        </button>
                      </li>
                    ))}
                    {tasks.length > 12 ? (
                      <li className="text-2xs text-steel">+{tasks.length - 12} more</li>
                    ) : null}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <TaskDialog draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
