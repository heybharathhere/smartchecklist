import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { addMonths, format, monthGrid, startOfMonth, toISO } from '@/lib/date';
import { priority as prioritySpec } from '@/lib/palette';
import { Button } from '@/components/ui/primitives';
import { usePrefs } from '@/store/usePrefs';
import { weekdayNames } from '@/lib/date';
import type { Task } from '@/types';

export function CalendarView({
  tasks,
  onEdit,
  onAddOn,
}: {
  tasks: Task[];
  onEdit: (id: string) => void;
  onAddOn?: (iso: string) => void;
}) {
  const weekStartsOn = usePrefs((state) => state.weekStartsOn);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => monthGrid(month, weekStartsOn), [month, weekStartsOn]);
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const bucket = map.get(task.dueDate);
      if (bucket) bucket.push(task);
      else map.set(task.dueDate, [task]);
    }
    return map;
  }, [tasks]);

  const undated = tasks.filter((task) => !task.dueDate);
  const today = toISO(new Date());
  const currentMonth = month.getMonth();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base text-limestone">{format(month, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border">
        <div className="grid grid-cols-7 border-b bg-steel/5">
          {weekdayNames(weekStartsOn).map((name, index) => (
            <div key={`${name}-${index}`} className="px-2 py-1.5 text-center text-2xs text-steel">
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const iso = toISO(day);
            const dayTasks = byDay.get(iso) ?? [];
            const isToday = iso === today;
            const outside = day.getMonth() !== currentMonth;
            return (
              <div
                key={iso}
                className={cn(
                  'min-h-[5.5rem] border-b border-r p-1.5 last:border-r-0',
                  outside && 'bg-steel/4 text-steel/60',
                  isToday && 'bg-copper/8',
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      'tabular text-2xs',
                      isToday ? 'font-semibold text-copper' : 'text-steel',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {onAddOn ? (
                    <button
                      onClick={() => onAddOn(iso)}
                      aria-label={`Add a task due ${iso}`}
                      className="text-2xs text-steel/0 transition-colors hover:text-copper focus-visible:text-copper sm:hover:text-copper"
                    >
                      +
                    </button>
                  ) : null}
                </div>
                <ul className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <li key={task.id}>
                      <button
                        onClick={() => onEdit(task.id)}
                        className={cn(
                          'flex w-full items-center gap-1 rounded-[7px] px-1 py-0.5 text-left text-2xs transition-colors hover:bg-steel/12',
                          task.completed ? 'text-steel line-through' : 'text-limestone',
                        )}
                      >
                        <span
                          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', prioritySpec(task.priority).dot)}
                        />
                        <span className="truncate">{task.title}</span>
                      </button>
                    </li>
                  ))}
                  {dayTasks.length > 3 ? (
                    <li className="px-1 text-2xs text-steel">+{dayTasks.length - 3} more</li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {undated.length ? (
        <div className="rounded-card border p-3">
          <p className="mb-2 text-sm text-steel">
            {undated.length} {undated.length === 1 ? 'task has' : 'tasks have'} no due date
          </p>
          <div className="flex flex-wrap gap-1.5">
            {undated.slice(0, 14).map((task) => (
              <button
                key={task.id}
                onClick={() => onEdit(task.id)}
                className="rounded-full border px-2.5 py-1 text-2xs text-limestone hover:border-copper/50"
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
