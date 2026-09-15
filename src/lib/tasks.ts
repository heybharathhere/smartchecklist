import { daysUntil, isOverdue } from '@/lib/date';
import { priority as prioritySpec } from '@/lib/palette';
import type {
  Checklist,
  ChecklistProgress,
  FilterState,
  Priority,
  Task,
} from '@/types';

export interface TaskNode {
  task: Task;
  depth: number;
  children: TaskNode[];
  /** Progress of this node's own subtree (excludes itself). */
  subProgress: ChecklistProgress;
}

export const EMPTY_FILTER: FilterState = {
  query: '',
  status: 'all',
  priorities: [],
  categories: [],
  tags: [],
  due: 'any',
  sort: 'manual',
};

export function byOrder(a: Task, b: Task): number {
  return a.order - b.order || a.createdAt - b.createdAt;
}

/** Builds the nested tree for a flat task list. Orphans are lifted to the root. */
export function buildTree(tasks: Task[]): TaskNode[] {
  const byParent = new Map<string | null, Task[]>();
  const ids = new Set(tasks.map((t) => t.id));

  for (const task of tasks) {
    const parent = task.parentId && ids.has(task.parentId) ? task.parentId : null;
    const bucket = byParent.get(parent);
    if (bucket) bucket.push(task);
    else byParent.set(parent, [task]);
  }

  const build = (parentId: string | null, depth: number): TaskNode[] =>
    (byParent.get(parentId) ?? [])
      .slice()
      .sort(byOrder)
      .map((task) => {
        const children = build(task.id, depth + 1);
        return { task, depth, children, subProgress: progressOfNodes(children) };
      });

  return build(null, 0);
}

export function flattenTree(nodes: TaskNode[], collapsed?: Set<string>): TaskNode[] {
  const out: TaskNode[] = [];
  const walk = (list: TaskNode[]) => {
    for (const node of list) {
      out.push(node);
      if (!collapsed?.has(node.task.id)) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

export function allDescendants(nodes: TaskNode[]): Task[] {
  const out: Task[] = [];
  const walk = (list: TaskNode[]) => {
    for (const node of list) {
      out.push(node.task);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/** Ids of a task and everything nested beneath it (for cascade delete). */
export function subtreeIds(tasks: Task[], rootId: string): string[] {
  const children = new Map<string, string[]>();
  for (const task of tasks) {
    if (!task.parentId) continue;
    const list = children.get(task.parentId);
    if (list) list.push(task.id);
    else children.set(task.parentId, [task.id]);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop() as string;
    out.push(id);
    for (const child of children.get(id) ?? []) stack.push(child);
  }
  return out;
}

export function depthOf(tasks: Task[], taskId: string | null): number {
  let depth = 0;
  let current = taskId;
  const index = new Map(tasks.map((t) => [t.id, t]));
  while (current) {
    const task = index.get(current);
    if (!task || !task.parentId) break;
    current = task.parentId;
    depth += 1;
    if (depth > 64) break; // cycle guard
  }
  return depth;
}

export function emptyProgress(): ChecklistProgress {
  return { total: 0, done: 0, open: 0, overdue: 0, percent: 0 };
}

export function progressOfTasks(tasks: Task[]): ChecklistProgress {
  const total = tasks.length;
  let done = 0;
  let overdue = 0;
  for (const task of tasks) {
    if (task.completed) done += 1;
    if (isOverdue(task.dueDate, task.completed)) overdue += 1;
  }
  return {
    total,
    done,
    open: total - done,
    overdue,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}

function progressOfNodes(nodes: TaskNode[]): ChecklistProgress {
  return progressOfTasks(allDescendants(nodes));
}

export function progressOfChecklist(tasks: Task[], checklistId: string): ChecklistProgress {
  return progressOfTasks(tasks.filter((t) => t.checklistId === checklistId));
}

function matchesDue(task: Task, due: FilterState['due']): boolean {
  if (due === 'any') return true;
  if (due === 'none') return !task.dueDate;
  if (!task.dueDate) return false;
  if (due === 'overdue') return isOverdue(task.dueDate, task.completed);
  const diff = daysUntil(task.dueDate);
  if (diff === null) return false;
  if (due === 'today') return diff === 0;
  if (due === 'tomorrow') return diff === 1;
  if (due === 'week') return diff >= 0 && diff <= 7;
  if (due === 'month') return diff >= 0 && diff <= 31;
  return true;
}

function matchesStatus(task: Task, status: FilterState['status']): boolean {
  switch (status) {
    case 'all':
      return true;
    case 'open':
      return !task.completed;
    case 'done':
      return task.completed;
    default:
      return task.status === status;
  }
}

export function taskMatches(
  task: Task,
  filter: FilterState,
  checklist?: Checklist,
): boolean {
  const query = filter.query.trim().toLowerCase();
  if (query) {
    const haystack = `${task.title} ${task.notes} ${task.tags.join(' ')}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (!matchesStatus(task, filter.status)) return false;
  if (filter.priorities.length && !filter.priorities.includes(task.priority)) return false;
  if (filter.tags.length && !filter.tags.some((tag) => task.tags.includes(tag))) return false;
  if (filter.categories.length) {
    if (!checklist || !filter.categories.includes(checklist.category)) return false;
  }
  if (!matchesDue(task, filter.due)) return false;
  return true;
}

/**
 * Smart sort: unfinished first, then urgency (overdue → due soon → undated),
 * then priority weight, then manual order. Mirrors how people actually triage.
 */
export function smartScore(task: Task): number {
  if (task.completed) return 10_000 + task.order;
  const diff = daysUntil(task.dueDate);
  const urgency = diff === null ? 400 : Math.max(-60, Math.min(365, diff)) * 4;
  return urgency + prioritySpec(task.priority).weight * 12;
}

export function sortTasks(tasks: Task[], sort: FilterState['sort']): Task[] {
  const list = tasks.slice();
  switch (sort) {
    case 'due':
      return list.sort(
        (a, b) =>
          (a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY) -
            (b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY) || byOrder(a, b),
      );
    case 'priority':
      return list.sort(
        (a, b) =>
          prioritySpec(a.priority).weight - prioritySpec(b.priority).weight || byOrder(a, b),
      );
    case 'created':
      return list.sort((a, b) => b.createdAt - a.createdAt);
    case 'alpha':
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'smart':
      return list.sort((a, b) => smartScore(a) - smartScore(b) || byOrder(a, b));
    default:
      return list.sort(byOrder);
  }
}

export function isFilterActive(filter: FilterState): boolean {
  return (
    filter.query.trim() !== '' ||
    filter.status !== 'all' ||
    filter.priorities.length > 0 ||
    filter.categories.length > 0 ||
    filter.tags.length > 0 ||
    filter.due !== 'any'
  );
}

export function nextOrder(tasks: Task[], checklistId: string, parentId: string | null): number {
  const siblings = tasks.filter((t) => t.checklistId === checklistId && t.parentId === parentId);
  return siblings.length ? Math.max(...siblings.map((t) => t.order)) + 1 : 0;
}

export function uniqueTags(tasks: Task[], checklists: Checklist[]): string[] {
  const set = new Set<string>();
  tasks.forEach((task) => task.tags.forEach((tag) => set.add(tag)));
  checklists.forEach((list) => list.tags.forEach((tag) => set.add(tag)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function uniqueCategories(checklists: Checklist[]): string[] {
  const set = new Set<string>();
  checklists.forEach((list) => {
    if (list.category) set.add(list.category);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Eisenhower quadrant from urgency (due date) and importance (priority). */
export function quadrantOf(task: Task): 1 | 2 | 3 | 4 {
  const diff = daysUntil(task.dueDate);
  const urgent = diff !== null && diff <= 2;
  const important: Priority[] = ['critical', 'high'];
  const isImportant = important.includes(task.priority);
  if (urgent && isImportant) return 1;
  if (!urgent && isImportant) return 2;
  if (urgent && !isImportant) return 3;
  return 4;
}
