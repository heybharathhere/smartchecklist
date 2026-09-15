import { cn } from '@/lib/cn';
import { isOverdue, relativeDay } from '@/lib/date';
import { priority as prioritySpec, statusLabel } from '@/lib/palette';
import { Checkbox, EmptyState } from '@/components/ui/primitives';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import { useUI } from '@/store/useUI';
import type { Task } from '@/types';

/** Dense one-line-per-task table for scanning long lists. */
export function CompactView({
  tasks,
  onEdit,
  checklistNames,
}: {
  tasks: Task[];
  onEdit: (id: string) => void;
  checklistNames?: Map<string, string>;
}) {
  const dateFormat = usePrefs((state) => state.dateFormat);
  const toggleTask = useData((state) => state.toggleTask);
  const selection = useUI((state) => state.selection);
  const toggleSelected = useUI((state) => state.toggleSelected);
  const selectMany = useUI((state) => state.selectMany);
  const clearSelection = useUI((state) => state.clearSelection);

  if (!tasks.length) {
    return <EmptyState title="Nothing to show" body="No tasks match the current filters." />;
  }

  const allSelected = tasks.length > 0 && tasks.every((task) => selection.includes(task.id));

  return (
    <div className="overflow-x-auto rounded-card border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-steel/5 text-left text-2xs text-steel">
            <th scope="col" className="w-10 px-2 py-2">
              <Checkbox
                checked={allSelected}
                indeterminate={!allSelected && tasks.some((task) => selection.includes(task.id))}
                onChange={() => (allSelected ? clearSelection() : selectMany(tasks.map((task) => task.id)))}
                label="Select all visible tasks"
              />
            </th>
            <th scope="col" className="px-2 py-2 font-medium">Task</th>
            <th scope="col" className="hidden px-2 py-2 font-medium sm:table-cell">Priority</th>
            <th scope="col" className="hidden px-2 py-2 font-medium md:table-cell">Status</th>
            <th scope="col" className="px-2 py-2 font-medium">Due</th>
            {checklistNames ? (
              <th scope="col" className="hidden px-2 py-2 font-medium lg:table-cell">Checklist</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const spec = prioritySpec(task.priority);
            const late = isOverdue(task.dueDate, task.completed);
            return (
              <tr
                key={task.id}
                className={cn(
                  'border-b last:border-b-0 transition-colors hover:bg-steel/6',
                  selection.includes(task.id) && 'bg-copper/8',
                )}
              >
                <td className="px-2 py-1.5">
                  <Checkbox
                    checked={selection.includes(task.id)}
                    onChange={() => toggleSelected(task.id)}
                    label={`Select ${task.title}`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={task.completed}
                      onChange={() => void toggleTask(task.id)}
                      label={`Mark ${task.title} ${task.completed ? 'not done' : 'done'}`}
                    />
                    <button
                      onClick={() => onEdit(task.id)}
                      className={cn(
                        'truncate text-left',
                        task.completed ? 'text-steel line-through' : 'text-limestone',
                      )}
                    >
                      {task.title}
                    </button>
                  </div>
                </td>
                <td className="hidden px-2 py-1.5 sm:table-cell">
                  <span className="inline-flex items-center gap-1.5 text-2xs text-steel">
                    <span className={cn('h-1.5 w-1.5 rounded-full', spec.dot)} />
                    {spec.label}
                  </span>
                </td>
                <td className="hidden px-2 py-1.5 text-2xs text-steel md:table-cell">
                  {task.completed ? 'Done' : statusLabel(task.status)}
                </td>
                <td className={cn('px-2 py-1.5 text-2xs', late ? 'font-medium text-critical' : 'text-steel')}>
                  {task.dueDate ? relativeDay(task.dueDate, dateFormat) : '—'}
                </td>
                {checklistNames ? (
                  <td className="hidden px-2 py-1.5 text-2xs text-steel lg:table-cell">
                    {checklistNames.get(task.checklistId) ?? ''}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
