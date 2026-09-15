import { format } from '@/lib/date';
import { uid } from '@/lib/id';
import type {
  ActivityEntry,
  BackupPayload,
  Checklist,
  ColorKey,
  IconKey,
  Priority,
  SavedFilter,
  Task,
  TaskStatus,
  Template,
} from '@/types';

export const EXPORT_VERSION = 1;

export function download(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give Safari a beat before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function stamp(): string {
  return format(new Date(), 'yyyy-MM-dd-HHmm');
}

export function buildPayload(data: {
  checklists: Checklist[];
  tasks: Task[];
  templates: Template[];
  savedFilters: SavedFilter[];
  activity: ActivityEntry[];
}): BackupPayload {
  return {
    app: 'smart-checklist',
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    checklists: data.checklists,
    tasks: data.tasks,
    templates: data.templates.filter((t) => !t.builtIn),
    savedFilters: data.savedFilters,
    activity: data.activity.slice(-500),
  };
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function tasksToCSV(checklists: Checklist[], tasks: Task[]): string {
  const names = new Map(checklists.map((list) => [list.id, list]));
  const titles = new Map(tasks.map((task) => [task.id, task.title]));
  const header = [
    'Checklist',
    'Category',
    'Parent task',
    'Task',
    'Notes',
    'Priority',
    'Status',
    'Completed',
    'Start date',
    'Due date',
    'Tags',
    'Created',
    'Completed at',
  ];
  const rows = tasks.map((task) => [
    names.get(task.checklistId)?.title ?? '',
    names.get(task.checklistId)?.category ?? '',
    task.parentId ? titles.get(task.parentId) ?? '' : '',
    task.title,
    task.notes,
    task.priority,
    task.status,
    task.completed ? 'yes' : 'no',
    task.startDate ?? '',
    task.dueDate ?? '',
    task.tags.join(' | '),
    format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm'),
    task.completedAt ? format(new Date(task.completedAt), 'yyyy-MM-dd HH:mm') : '',
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

// ---------- Import ----------

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];
const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const bool = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;
const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
const isoOrNull = (value: unknown): string | null =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

export interface ImportResult {
  payload: BackupPayload;
  warnings: string[];
}

/**
 * Parses and sanitises an exported file. Unknown fields are dropped and ids are
 * remapped when they clash with nothing — the caller decides merge vs replace.
 */
export function parseImport(raw: string): ImportResult {
  const warnings: string[] = [];
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!data || typeof data !== 'object') throw new Error('That file does not contain app data.');
  if (data.app && data.app !== 'smart-checklist') {
    warnings.push('The file was exported by a different app; importing what could be read.');
  }
  if (!Array.isArray(data.checklists) || !Array.isArray(data.tasks)) {
    throw new Error('No checklists or tasks were found in that file.');
  }

  const now = Date.now();
  const checklists: Checklist[] = data.checklists.map((row: any, index: number) => ({
    id: str(row?.id) || uid('cl_'),
    title: str(row?.title, 'Untitled checklist'),
    description: str(row?.description),
    color: (str(row?.color, 'copper') as ColorKey) ?? 'copper',
    icon: (str(row?.icon, 'checklist') as IconKey) ?? 'checklist',
    category: str(row?.category),
    tags: list(row?.tags),
    favorite: bool(row?.favorite),
    pinned: bool(row?.pinned),
    archived: bool(row?.archived),
    defaultView: row?.defaultView ?? null,
    order: num(row?.order, index),
    createdAt: num(row?.createdAt, now),
    updatedAt: num(row?.updatedAt, now),
    lastOpenedAt: typeof row?.lastOpenedAt === 'number' ? row.lastOpenedAt : null,
  }));

  const known = new Set(checklists.map((c) => c.id));
  const tasks: Task[] = [];
  for (const row of data.tasks as any[]) {
    const checklistId = str(row?.checklistId);
    if (!known.has(checklistId)) {
      warnings.push(`Skipped a task that pointed at a missing checklist: ${str(row?.title, 'untitled')}`);
      continue;
    }
    const completed = bool(row?.completed);
    tasks.push({
      id: str(row?.id) || uid('tk_'),
      checklistId,
      parentId: str(row?.parentId) || null,
      title: str(row?.title, 'Untitled task'),
      notes: str(row?.notes),
      priority: PRIORITIES.includes(row?.priority) ? row.priority : 'medium',
      status: STATUSES.includes(row?.status) ? row.status : completed ? 'done' : 'todo',
      completed,
      completedAt: typeof row?.completedAt === 'number' ? row.completedAt : completed ? now : null,
      startDate: isoOrNull(row?.startDate),
      dueDate: isoOrNull(row?.dueDate),
      reminderAt: typeof row?.reminderAt === 'number' ? row.reminderAt : null,
      reminderFired: bool(row?.reminderFired, true),
      tags: list(row?.tags),
      recurrence:
        row?.recurrence && typeof row.recurrence === 'object'
          ? {
              freq: ['daily', 'weekly', 'monthly'].includes(row.recurrence.freq)
                ? row.recurrence.freq
                : 'daily',
              interval: Math.max(1, num(row.recurrence.interval, 1)),
              weekdays: Array.isArray(row.recurrence.weekdays)
                ? row.recurrence.weekdays.filter((d: unknown) => typeof d === 'number')
                : undefined,
            }
          : null,
      order: num(row?.order, tasks.length),
      createdAt: num(row?.createdAt, now),
      updatedAt: num(row?.updatedAt, now),
    });
  }

  // Drop parent links that did not survive the import.
  const taskIds = new Set(tasks.map((t) => t.id));
  for (const task of tasks) {
    if (task.parentId && !taskIds.has(task.parentId)) task.parentId = null;
  }

  const templates: Template[] = Array.isArray(data.templates)
    ? data.templates.map((row: any) => ({
        id: str(row?.id) || uid('tpl_'),
        name: str(row?.name, 'Untitled template'),
        description: str(row?.description),
        category: str(row?.category),
        color: (str(row?.color, 'copper') as ColorKey) ?? 'copper',
        icon: (str(row?.icon, 'checklist') as IconKey) ?? 'checklist',
        tasks: Array.isArray(row?.tasks) ? row.tasks : [],
        builtIn: false,
        createdAt: num(row?.createdAt, now),
      }))
    : [];

  const savedFilters: SavedFilter[] = Array.isArray(data.savedFilters)
    ? data.savedFilters.filter((row: any) => row && typeof row === 'object' && row.filter)
    : [];

  const activity: ActivityEntry[] = Array.isArray(data.activity)
    ? data.activity.filter((row: any) => row && typeof row.ts === 'number')
    : [];

  return {
    payload: {
      app: 'smart-checklist',
      version: EXPORT_VERSION,
      exportedAt: num(data.exportedAt, now),
      checklists,
      tasks,
      templates,
      savedFilters,
      activity,
    },
    warnings,
  };
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsText(file);
  });
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
