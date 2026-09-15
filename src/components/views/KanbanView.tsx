import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { isOverdue, relativeDay } from '@/lib/date';
import { priority as prioritySpec } from '@/lib/palette';
import { Badge } from '@/components/ui/primitives';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import type { Task, TaskStatus } from '@/types';

const COLUMNS: { key: TaskStatus; label: string; accent: string }[] = [
  { key: 'todo', label: 'To do', accent: 'bg-steel' },
  { key: 'in_progress', label: 'In progress', accent: 'bg-medium' },
  { key: 'blocked', label: 'Blocked', accent: 'bg-critical' },
  { key: 'done', label: 'Done', accent: 'bg-teal' },
];

function Card({ task, onEdit }: { task: Task; onEdit: (id: string) => void }) {
  const sortable = useSortable({ id: task.id });
  const dateFormat = usePrefs((state) => state.dateFormat);
  const spec = prioritySpec(task.priority);
  const late = isOverdue(task.dueDate, task.completed);

  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      {...sortable.attributes}
      {...sortable.listeners}
      className={cn(
        'cursor-grab touch-none rounded-control border bg-surface p-2.5 text-left active:cursor-grabbing',
        sortable.isDragging && 'opacity-60 shadow-float',
      )}
    >
      <button onClick={() => onEdit(task.id)} className="block w-full text-left">
        <p
          className={cn(
            'text-sm leading-snug',
            task.completed ? 'text-steel line-through' : 'text-limestone',
          )}
        >
          {task.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge className={spec.className} dot={spec.dot}>
            {spec.label}
          </Badge>
          {task.dueDate ? (
            <span className={cn('text-2xs', late ? 'font-medium text-critical' : 'text-steel')}>
              {relativeDay(task.dueDate, dateFormat)}
            </span>
          ) : null}
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-2xs text-steel">
              #{tag}
            </span>
          ))}
        </div>
      </button>
    </div>
  );
}

function Column({
  column,
  tasks,
  onEdit,
  onAdd,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  onEdit: (id: string) => void;
  onAdd: () => void;
}) {
  const droppable = useDroppable({ id: `column:${column.key}` });

  return (
    <section
      ref={droppable.setNodeRef}
      className={cn(
        'flex w-[17rem] shrink-0 flex-col rounded-card border p-2.5 transition-colors sm:w-auto',
        droppable.isOver ? 'border-copper/50 bg-copper/6' : 'bg-steel/4',
      )}
    >
      <header className="mb-2.5 flex items-center gap-2 px-1">
        <span className={cn('h-2 w-2 rounded-full', column.accent)} />
        <h3 className="text-sm font-medium text-limestone">{column.label}</h3>
        <span className="tabular text-2xs text-steel">{tasks.length}</span>
        <button
          onClick={onAdd}
          aria-label={`Add a task to ${column.label}`}
          className="ml-auto rounded-control p-1 text-steel hover:bg-steel/12 hover:text-limestone"
        >
          <Plus size={14} />
        </button>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[4.5rem] flex-col gap-2">
          {tasks.map((task) => (
            <Card key={task.id} task={task} onEdit={onEdit} />
          ))}
          {tasks.length === 0 ? (
            <p className="rounded-control border border-dashed px-2.5 py-4 text-center text-2xs text-steel">
              Drop tasks here
            </p>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

export function KanbanView({
  tasks,
  onEdit,
  onAdd,
}: {
  tasks: Task[];
  onEdit: (id: string) => void;
  onAdd: () => void;
}) {
  const setStatus = useData((state) => state.setStatus);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byColumn = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>(COLUMNS.map((column) => [column.key, []]));
    for (const task of tasks) {
      const key: TaskStatus = task.completed ? 'done' : task.status === 'done' ? 'todo' : task.status;
      map.get(key)?.push(task);
    }
    return map;
  }, [tasks]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const overId = String(over.id);
    const target = overId.startsWith('column:')
      ? (overId.slice('column:'.length) as TaskStatus)
      : tasks.find((task) => task.id === overId)?.status;
    if (!target) return;
    const current = tasks.find((task) => task.id === taskId);
    const currentColumn = current?.completed ? 'done' : current?.status;
    if (!current || currentColumn === target) return;
    void setStatus(taskId, target);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={onDragEnd}>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
        {COLUMNS.map((column) => (
          <Column
            key={column.key}
            column={column}
            tasks={byColumn.get(column.key) ?? []}
            onEdit={onEdit}
            onAdd={onAdd}
          />
        ))}
      </div>
    </DndContext>
  );
}
