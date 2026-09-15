import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';
import { addDays, differenceInCalendarDays, format, fromISO, startOfDay, toISO } from '@/lib/date';
import { priority as prioritySpec } from '@/lib/palette';
import { Badge, EmptyState } from '@/components/ui/primitives';
import type { Task } from '@/types';

const WINDOW_DAYS = 28;

interface Placed {
  task: Task;
  offset: number;
  span: number;
}

/**
 * A 28-day horizontal schedule. Tasks with a start date show as a span from
 * start to due; tasks with only a due date show as a single-day marker.
 */
export function TimelineView({ tasks, onEdit }: { tasks: Task[]; onEdit: (id: string) => void }) {
  const start = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(
    () => Array.from({ length: WINDOW_DAYS }, (_, index) => addDays(start, index)),
    [start],
  );

  const { placed, overdue, undated, later } = useMemo(() => {
    const placedRows: Placed[] = [];
    const overdueRows: Task[] = [];
    const undatedRows: Task[] = [];
    const laterRows: Task[] = [];

    for (const task of tasks) {
      if (!task.dueDate) {
        undatedRows.push(task);
        continue;
      }
      const due = fromISO(task.dueDate);
      if (!due) {
        undatedRows.push(task);
        continue;
      }
      const dueOffset = differenceInCalendarDays(startOfDay(due), start);
      if (dueOffset < 0) {
        overdueRows.push(task);
        continue;
      }
      if (dueOffset >= WINDOW_DAYS) {
        laterRows.push(task);
        continue;
      }
      const startDate = task.startDate ? fromISO(task.startDate) : null;
      const startOffset = startDate
        ? Math.max(0, differenceInCalendarDays(startOfDay(startDate), start))
        : dueOffset;
      placedRows.push({
        task,
        offset: Math.min(startOffset, dueOffset),
        span: Math.max(1, dueOffset - Math.min(startOffset, dueOffset) + 1),
      });
    }

    return {
      placed: placedRows.sort((a, b) => a.offset - b.offset || a.span - b.span),
      overdue: overdueRows,
      undated: undatedRows,
      later: laterRows,
    };
  }, [tasks, start]);

  if (!tasks.length) {
    return (
      <EmptyState
        icon={<CalendarDays size={26} />}
        title="Nothing scheduled"
        body="Give tasks a start or due date and they will lay themselves out here."
      />
    );
  }

  const columnWidth = 44;
  const gridWidth = WINDOW_DAYS * columnWidth;

  return (
    <div className="space-y-4">
      {overdue.length ? (
        <section className="rounded-card border border-critical/35 bg-critical/6 p-3">
          <h3 className="mb-2 text-sm font-medium text-critical">
            {overdue.length} {overdue.length === 1 ? 'task is' : 'tasks are'} already past due
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {overdue.map((task) => (
              <button
                key={task.id}
                onClick={() => onEdit(task.id)}
                className="rounded-full border border-critical/35 px-2.5 py-1 text-2xs text-limestone hover:bg-critical/12"
              >
                {task.title}
                <span className="ml-1.5 text-critical">{task.dueDate}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-card border">
        <div style={{ minWidth: gridWidth + 220 }}>
          <div className="flex border-b bg-steel/5">
            <div className="w-[220px] shrink-0 px-3 py-2 text-2xs text-steel">Task</div>
            <div className="flex">
              {days.map((day) => {
                const isToday = toISO(day) === toISO(start);
                const weekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={toISO(day)}
                    style={{ width: columnWidth }}
                    className={cn(
                      'border-l px-1 py-2 text-center',
                      weekend && 'bg-steel/6',
                      isToday && 'bg-copper/10',
                    )}
                  >
                    <div className={cn('tabular text-2xs', isToday ? 'text-copper' : 'text-steel')}>
                      {format(day, 'd')}
                    </div>
                    <div className="text-[0.6rem] text-steel/70">{format(day, 'EEEEE')}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {placed.length === 0 ? (
            <p className="px-3 py-6 text-sm text-steel">
              Nothing falls inside the next four weeks.
            </p>
          ) : (
            placed.map(({ task, offset, span }) => (
              <div key={task.id} className="flex items-center border-b last:border-b-0">
                <div className="w-[220px] shrink-0 truncate px-3 py-2">
                  <button
                    onClick={() => onEdit(task.id)}
                    className={cn(
                      'max-w-full truncate text-left text-sm',
                      task.completed ? 'text-steel line-through' : 'text-limestone',
                    )}
                  >
                    {task.title}
                  </button>
                </div>
                <div className="relative py-2" style={{ width: gridWidth, height: 40 }}>
                  {days.map((day, index) => (
                    <span
                      key={toISO(day)}
                      aria-hidden="true"
                      className={cn(
                        'absolute top-0 h-full border-l',
                        (day.getDay() === 0 || day.getDay() === 6) && 'bg-steel/5',
                      )}
                      style={{ left: index * columnWidth, width: columnWidth }}
                    />
                  ))}
                  <button
                    onClick={() => onEdit(task.id)}
                    title={`${task.title}${task.startDate ? ` from ${task.startDate}` : ''} due ${task.dueDate}`}
                    className={cn(
                      'absolute top-1/2 flex h-6 -translate-y-1/2 items-center overflow-hidden rounded-full px-2 text-2xs font-medium text-ink transition-[filter] hover:brightness-110',
                      prioritySpec(task.priority).dot,
                      task.completed && 'opacity-55',
                    )}
                    style={{
                      left: offset * columnWidth + 3,
                      width: span * columnWidth - 6,
                    }}
                  >
                    <span className="truncate">{span > 1 ? task.title : ''}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {(later.length || undated.length) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {later.length ? (
            <section className="rounded-card border p-3">
              <h3 className="mb-2 text-sm text-steel">Beyond four weeks</h3>
              <ul className="space-y-1.5">
                {later.slice(0, 8).map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onEdit(task.id)}
                      className="min-w-0 truncate text-left text-sm text-limestone"
                    >
                      {task.title}
                    </button>
                    <Badge className="border-hairline shrink-0 text-steel">{task.dueDate}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {undated.length ? (
            <section className="rounded-card border p-3">
              <h3 className="mb-2 text-sm text-steel">No date set</h3>
              <ul className="space-y-1.5">
                {undated.slice(0, 8).map((task) => (
                  <li key={task.id}>
                    <button
                      onClick={() => onEdit(task.id)}
                      className="w-full truncate text-left text-sm text-limestone"
                    >
                      {task.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
