import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  CornerDownRight,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  Square,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { isOverdue, relativeDay } from '@/lib/date';
import { priority as prioritySpec, statusLabel } from '@/lib/palette';
import type { TaskNode } from '@/lib/tasks';
import { Badge, Checkbox } from '@/components/ui/primitives';
import { Menu } from '@/components/ui/Menu';
import { Input } from '@/components/ui/fields';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import { useUI } from '@/store/useUI';

export interface TaskRowProps {
  node: TaskNode;
  /** Off for views where drag handles make no sense (calendar, search results). */
  draggable?: boolean;
  showChecklistName?: string;
  onEdit: (taskId: string) => void;
  onAddSubtask: (parentId: string) => void;
}

export function TaskRow({ node, draggable = true, showChecklistName, onEdit, onAddSubtask }: TaskRowProps) {
  const { task, depth, children, subProgress } = node;
  const dateFormat = usePrefs((state) => state.dateFormat);
  const confirmDelete = usePrefs((state) => state.confirmDelete);
  const toggleTask = useData((state) => state.toggleTask);
  const updateTask = useData((state) => state.updateTask);
  const deleteTask = useData((state) => state.deleteTask);
  const indentTask = useData((state) => state.indentTask);
  const outdentTask = useData((state) => state.outdentTask);
  const createTask = useData((state) => state.createTask);
  const selection = useUI((state) => state.selection);
  const toggleSelected = useUI((state) => state.toggleSelected);
  const collapsed = useUI((state) => state.collapsed);
  const toggleCollapsed = useUI((state) => state.toggleCollapsed);

  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const sortable = useSortable({ id: task.id, disabled: !draggable });
  const late = isOverdue(task.dueDate, task.completed);
  const selected = selection.includes(task.id);
  const isCollapsed = collapsed.includes(task.id);
  const spec = prioritySpec(task.priority);

  const commitRename = () => {
    const next = draft.trim();
    setRenaming(false);
    if (next && next !== task.title) void updateTask(task.id, { title: next });
    else setDraft(task.title);
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
        marginLeft: depth ? depth * 22 : 0,
      }}
      className={cn(
        'group relative flex items-start gap-2.5 rounded-control border border-transparent px-2 py-2 transition-colors',
        selected ? 'border-copper/40 bg-copper/8' : 'hover:bg-steel/6',
        sortable.isDragging && 'z-10 border-hairline bg-surface shadow-float',
      )}
    >
      {depth > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -left-3 top-4 text-steel/40"
          style={{ lineHeight: 0 }}
        >
          <CornerDownRight size={13} />
        </span>
      ) : null}

      {draggable ? (
        <button
          {...sortable.attributes}
          {...sortable.listeners}
          aria-label={`Reorder ${task.title}`}
          className="mt-1 cursor-grab touch-none text-steel/0 transition-colors group-hover:text-steel/70 focus-visible:text-steel active:cursor-grabbing"
        >
          <GripVertical size={15} />
        </button>
      ) : (
        <span className="w-0" />
      )}

      <div className="mt-0.5 flex items-center gap-1.5">
        <Checkbox
          checked={task.completed}
          onChange={() => void toggleTask(task.id)}
          label={`Mark ${task.title} ${task.completed ? 'not done' : 'done'}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {children.length ? (
            <button
              onClick={() => toggleCollapsed(task.id)}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? `Expand ${task.title}` : `Collapse ${task.title}`}
              className="mt-0.5 shrink-0 text-steel hover:text-limestone"
            >
              {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
            </button>
          ) : null}

          {renaming ? (
            <Input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitRename();
                if (event.key === 'Escape') {
                  setDraft(task.title);
                  setRenaming(false);
                }
              }}
              className="h-8"
              aria-label="Rename task"
            />
          ) : (
            <button
              onDoubleClick={() => {
                setDraft(task.title);
                setRenaming(true);
              }}
              onClick={() => onEdit(task.id)}
              className={cn(
                'min-w-0 flex-1 text-left text-sm leading-snug',
                task.completed ? 'text-steel line-through decoration-steel/60' : 'text-limestone',
              )}
            >
              {task.title}
            </button>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-steel">
          <span className={cn('inline-flex items-center gap-1', spec.className.split(' ')[0])}>
            <span className={cn('h-1.5 w-1.5 rounded-full', spec.dot)} />
            {spec.label}
          </span>
          {task.status !== 'todo' && !task.completed ? <span>{statusLabel(task.status)}</span> : null}
          {task.dueDate ? (
            <span className={cn(late && 'font-medium text-critical')}>
              {relativeDay(task.dueDate, dateFormat)}
            </span>
          ) : null}
          {task.recurrence ? (
            <span className="inline-flex items-center gap-1">
              <Repeat size={11} />
              repeats
            </span>
          ) : null}
          {task.notes ? (
            <span className="inline-flex items-center gap-1">
              <StickyNote size={11} />
              note
            </span>
          ) : null}
          {children.length ? (
            <span className="tabular">
              {subProgress.done}/{subProgress.total} subtasks
            </span>
          ) : null}
          {showChecklistName ? <span className="text-steel/80">{showChecklistName}</span> : null}
          {task.tags.map((tag) => (
            <Badge key={tag} className="border-hairline text-steel">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          onClick={() => onAddSubtask(task.id)}
          aria-label={`Add a subtask under ${task.title}`}
          className="grid h-7 w-7 place-items-center rounded-control text-steel hover:bg-steel/12 hover:text-limestone"
        >
          <Plus size={14} />
        </button>
        <Menu
          label={`Actions for ${task.title}`}
          items={[
            { label: 'Edit details', icon: <Pencil size={14} />, onSelect: () => onEdit(task.id) },
            {
              label: 'Add subtask',
              icon: <Plus size={14} />,
              onSelect: () => onAddSubtask(task.id),
            },
            {
              label: 'Duplicate',
              icon: <Copy size={14} />,
              onSelect: () =>
                void createTask({
                  checklistId: task.checklistId,
                  parentId: task.parentId,
                  title: `${task.title} (copy)`,
                  notes: task.notes,
                  priority: task.priority,
                  startDate: task.startDate,
                  dueDate: task.dueDate,
                  tags: task.tags,
                  recurrence: task.recurrence,
                }),
            },
            {
              label: selected ? 'Deselect' : 'Select',
              icon: selected ? <CheckSquare size={14} /> : <Square size={14} />,
              onSelect: () => toggleSelected(task.id),
              separated: true,
            },
            {
              label: 'Nest under task above',
              icon: <ChevronsRight size={14} />,
              onSelect: () => void indentTask(task.id),
            },
            {
              label: 'Move out one level',
              icon: <ChevronsLeft size={14} />,
              onSelect: () => void outdentTask(task.id),
              disabled: !task.parentId,
            },
            {
              label: 'Delete',
              icon: <Trash2 size={14} />,
              danger: true,
              separated: true,
              onSelect: () => {
                if (
                  !confirmDelete ||
                  window.confirm(
                    children.length
                      ? `Delete “${task.title}” and its ${children.length} subtasks?`
                      : `Delete “${task.title}”?`,
                  )
                ) {
                  void deleteTask(task.id);
                }
              },
            },
          ]}
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              aria-label={`More actions for ${task.title}`}
              className="grid h-7 w-7 place-items-center rounded-control text-steel hover:bg-steel/12 hover:text-limestone"
            >
              <MoreHorizontal size={15} />
            </button>
          )}
        />
      </div>
    </div>
  );
}
