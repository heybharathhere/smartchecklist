import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ListTodo } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '@/components/ui/primitives';
import { TaskRow } from '@/components/tasks/TaskRow';
import { buildTree, byOrder, flattenTree, sortTasks } from '@/lib/tasks';
import { useData } from '@/store/useData';
import { useUI } from '@/store/useUI';
import type { Task } from '@/types';

export function ListView({
  checklistId,
  tasks,
  manualOrder,
  onEdit,
  onAddSubtask,
  emptyAction,
}: {
  checklistId: string;
  tasks: Task[];
  /** Drag reordering only makes sense while the manual sort is active. */
  manualOrder: boolean;
  onEdit: (taskId: string) => void;
  onAddSubtask: (parentId: string) => void;
  emptyAction?: React.ReactNode;
}) {
  const allTasks = useData((state) => state.tasks);
  const reorderSiblings = useData((state) => state.reorderSiblings);
  const moveTask = useData((state) => state.moveTask);
  const collapsed = useUI((state) => state.collapsed);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const nodes = useMemo(() => buildTree(tasks), [tasks]);
  const visible = useMemo(() => flattenTree(nodes, new Set(collapsed)), [nodes, collapsed]);
  const ids = visible.map((node) => node.task.id);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const source = allTasks.find((task) => task.id === active.id);
    const target = allTasks.find((task) => task.id === over.id);
    if (!source || !target) return;

    if (source.parentId === target.parentId) {
      const siblings = allTasks
        .filter((task) => task.checklistId === source.checklistId && task.parentId === source.parentId)
        .sort(byOrder)
        .map((task) => task.id);
      const from = siblings.indexOf(source.id);
      const to = siblings.indexOf(target.id);
      if (from === -1 || to === -1) return;
      const next = siblings.slice();
      next.splice(from, 1);
      next.splice(to, 0, source.id);
      void reorderSiblings(source.checklistId, source.parentId, next);
      return;
    }

    // Dropped onto a row in a different branch: adopt that row's parent.
    const siblings = allTasks
      .filter((task) => task.checklistId === target.checklistId && task.parentId === target.parentId)
      .sort(byOrder)
      .map((task) => task.id);
    void moveTask(source.id, target.parentId, Math.max(0, siblings.indexOf(target.id)));
  };

  if (!visible.length) {
    return (
      <EmptyState
        icon={<ListTodo size={26} />}
        title="No tasks here yet"
        body="Add the first task, or clear the filters if you are expecting to see something."
        action={emptyAction}
      />
    );
  }

  // When a non-manual sort is active the tree is flattened into one ordered run
  // so the chosen order is actually visible.
  if (!manualOrder) {
    const ordered = sortTasks(tasks, useUI.getState().filter.sort);
    return (
      <div className="space-y-0.5">
        {ordered.map((task) => {
          const node = visible.find((candidate) => candidate.task.id === task.id);
          return (
            <TaskRow
              key={task.id}
              node={node ?? { task, depth: 0, children: [], subProgress: { total: 0, done: 0, open: 0, overdue: 0, percent: 0 } }}
              draggable={false}
              onEdit={onEdit}
              onAddSubtask={onAddSubtask}
            />
          );
        })}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {visible.map((node) => (
            <TaskRow key={node.task.id} node={node} onEdit={onEdit} onAddSubtask={onAddSubtask} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
