import { create } from 'zustand';
import * as db from '@/lib/db';
import { nextOccurrence, toISO, addDays, fromISO } from '@/lib/date';
import { uid } from '@/lib/id';
import { BUILT_IN_TEMPLATES } from '@/lib/seed';
import { buildPayload } from '@/lib/transfer';
import { byOrder, nextOrder, subtreeIds } from '@/lib/tasks';
import type {
  ActivityEntry,
  BackupPayload,
  BackupRecord,
  Checklist,
  ColorKey,
  FilterState,
  IconKey,
  Priority,
  SavedFilter,
  Task,
  TaskStatus,
  Template,
  TemplateTask,
  ViewMode,
} from '@/types';

const ACTIVITY_CAP = 300;

export interface UndoAction {
  label: string;
  run: () => Promise<void>;
}

export interface NewChecklist {
  title: string;
  description?: string;
  color?: ColorKey;
  icon?: IconKey;
  category?: string;
  tags?: string[];
  defaultView?: ViewMode | null;
}

export interface NewTask {
  checklistId: string;
  title: string;
  parentId?: string | null;
  notes?: string;
  priority?: Priority;
  status?: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  reminderAt?: number | null;
  tags?: string[];
  recurrence?: Task['recurrence'];
}

interface DataState {
  ready: boolean;
  error: string | null;
  checklists: Checklist[];
  tasks: Task[];
  activity: ActivityEntry[];
  templates: Template[];
  savedFilters: SavedFilter[];
  undo: UndoAction | null;

  load: () => Promise<void>;
  clearUndo: () => void;

  createChecklist: (input: NewChecklist) => Promise<Checklist>;
  updateChecklist: (id: string, patch: Partial<Checklist>) => Promise<void>;
  deleteChecklist: (id: string) => Promise<void>;
  duplicateChecklist: (id: string) => Promise<Checklist | null>;
  reorderChecklists: (orderedIds: string[]) => Promise<void>;
  touchChecklist: (id: string) => Promise<void>;

  createTask: (input: NewTask) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string, completed?: boolean) => Promise<void>;
  setStatus: (id: string, status: TaskStatus) => Promise<void>;
  reorderSiblings: (checklistId: string, parentId: string | null, orderedIds: string[]) => Promise<void>;
  moveTask: (id: string, parentId: string | null, index?: number) => Promise<void>;
  indentTask: (id: string) => Promise<void>;
  outdentTask: (id: string) => Promise<void>;
  bulkComplete: (ids: string[], completed: boolean) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkPriority: (ids: string[], priority: Priority) => Promise<void>;
  bulkDue: (ids: string[], dueDate: string | null) => Promise<void>;
  bulkMove: (ids: string[], checklistId: string) => Promise<void>;

  saveTemplate: (template: Template) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  templateFromChecklist: (checklistId: string, name: string) => Promise<Template | null>;
  createFromTemplate: (templateId: string, title?: string) => Promise<Checklist | null>;

  saveFilter: (name: string, filter: FilterState) => Promise<SavedFilter>;
  deleteFilter: (id: string) => Promise<void>;

  importPayload: (payload: BackupPayload, mode: 'merge' | 'replace') => Promise<void>;
  resetAll: () => Promise<void>;
  createBackup: (automatic: boolean, keep: number) => Promise<BackupRecord>;
  listBackups: () => Promise<BackupRecord[]>;
  restoreBackup: (id: string) => Promise<void>;
  deleteBackup: (id: string) => Promise<void>;
}

function log(
  kind: ActivityEntry['kind'],
  entity: ActivityEntry['entity'],
  entityId: string,
  message: string,
): ActivityEntry {
  return { id: uid('ac_'), ts: Date.now(), kind, entity, entityId, message };
}

export const useData = create<DataState>((set, get) => {
  /** Appends to the activity feed, trims it and persists in one place. */
  const record = async (entries: ActivityEntry[]) => {
    if (!entries.length) return;
    const merged = [...get().activity, ...entries].slice(-ACTIVITY_CAP);
    set({ activity: merged });
    await db.putMany('activity', entries);
    const overflow = merged.length >= ACTIVITY_CAP;
    if (overflow) {
      const keep = new Set(merged.map((e) => e.id));
      const stored = await db.getAll<ActivityEntry>('activity');
      await db.removeMany(
        'activity',
        stored.filter((e) => !keep.has(e.id)).map((e) => e.id),
      );
    }
  };

  const persistTasks = async (tasks: Task[]) => db.putMany('tasks', tasks);

  return {
    ready: false,
    error: null,
    checklists: [],
    tasks: [],
    activity: [],
    templates: BUILT_IN_TEMPLATES,
    savedFilters: [],
    undo: null,

    clearUndo: () => set({ undo: null }),

    load: async () => {
      try {
        const [checklists, tasks, activity, templates, savedFilters] = await Promise.all([
          db.getAll<Checklist>('checklists'),
          db.getAll<Task>('tasks'),
          db.getAll<ActivityEntry>('activity'),
          db.getAll<Template>('templates'),
          db.getAll<SavedFilter>('filters'),
        ]);
        set({
          checklists: checklists.sort((a, b) => a.order - b.order),
          tasks: tasks.sort(byOrder),
          activity: activity.sort((a, b) => a.ts - b.ts).slice(-ACTIVITY_CAP),
          templates: [...BUILT_IN_TEMPLATES, ...templates],
          savedFilters: savedFilters.sort((a, b) => a.createdAt - b.createdAt),
          ready: true,
          error: null,
        });
        void db.requestPersistence();
      } catch (error) {
        set({
          ready: true,
          error:
            error instanceof Error
              ? error.message
              : 'Storage could not be opened. Private browsing can block it.',
        });
      }
    },

    // ---------- Checklists ----------

    createChecklist: async (input) => {
      const now = Date.now();
      const { checklists } = get();
      const checklist: Checklist = {
        id: uid('cl_'),
        title: input.title.trim() || 'Untitled checklist',
        description: input.description?.trim() ?? '',
        color: input.color ?? 'copper',
        icon: input.icon ?? 'checklist',
        category: input.category?.trim() ?? '',
        tags: input.tags ?? [],
        favorite: false,
        pinned: false,
        archived: false,
        defaultView: input.defaultView ?? null,
        order: checklists.length ? Math.max(...checklists.map((c) => c.order)) + 1 : 0,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      };
      set({ checklists: [...checklists, checklist] });
      await db.put('checklists', checklist);
      await record([log('created', 'checklist', checklist.id, `Created ${checklist.title}`)]);
      return checklist;
    },

    updateChecklist: async (id, patch) => {
      const existing = get().checklists.find((c) => c.id === id);
      if (!existing) return;
      const updated: Checklist = { ...existing, ...patch, id, updatedAt: Date.now() };
      set({ checklists: get().checklists.map((c) => (c.id === id ? updated : c)) });
      await db.put('checklists', updated);
      if (patch.archived !== undefined && patch.archived !== existing.archived) {
        await record([
          log(
            patch.archived ? 'archived' : 'restored',
            'checklist',
            id,
            `${patch.archived ? 'Archived' : 'Restored'} ${updated.title}`,
          ),
        ]);
      }
    },

    deleteChecklist: async (id) => {
      const checklist = get().checklists.find((c) => c.id === id);
      if (!checklist) return;
      const owned = get().tasks.filter((t) => t.checklistId === id);
      set({
        checklists: get().checklists.filter((c) => c.id !== id),
        tasks: get().tasks.filter((t) => t.checklistId !== id),
        undo: {
          label: `Deleted ${checklist.title}`,
          run: async () => {
            set({
              checklists: [...get().checklists, checklist].sort((a, b) => a.order - b.order),
              tasks: [...get().tasks, ...owned].sort(byOrder),
              undo: null,
            });
            await db.put('checklists', checklist);
            await persistTasks(owned);
          },
        },
      });
      await db.remove('checklists', id);
      await db.removeMany('tasks', owned.map((t) => t.id));
      await record([
        log('deleted', 'checklist', id, `Deleted ${checklist.title} and ${owned.length} tasks`),
      ]);
    },

    duplicateChecklist: async (id) => {
      const source = get().checklists.find((c) => c.id === id);
      if (!source) return null;
      const now = Date.now();
      const copy: Checklist = {
        ...source,
        id: uid('cl_'),
        title: `${source.title} (copy)`,
        pinned: false,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        order: get().checklists.length
          ? Math.max(...get().checklists.map((c) => c.order)) + 1
          : 0,
      };

      const idMap = new Map<string, string>();
      const sourceTasks = get().tasks.filter((t) => t.checklistId === id);
      sourceTasks.forEach((task) => idMap.set(task.id, uid('tk_')));
      const copies: Task[] = sourceTasks.map((task) => ({
        ...task,
        id: idMap.get(task.id) as string,
        checklistId: copy.id,
        parentId: task.parentId ? idMap.get(task.parentId) ?? null : null,
        createdAt: now,
        updatedAt: now,
      }));

      set({ checklists: [...get().checklists, copy], tasks: [...get().tasks, ...copies] });
      await db.put('checklists', copy);
      await persistTasks(copies);
      await record([log('created', 'checklist', copy.id, `Duplicated ${source.title}`)]);
      return copy;
    },

    reorderChecklists: async (orderedIds) => {
      const index = new Map(orderedIds.map((id, i) => [id, i]));
      const updated = get()
        .checklists.map((c) => (index.has(c.id) ? { ...c, order: index.get(c.id) as number } : c))
        .sort((a, b) => a.order - b.order);
      set({ checklists: updated });
      await db.putMany('checklists', updated.filter((c) => index.has(c.id)));
    },

    touchChecklist: async (id) => {
      const existing = get().checklists.find((c) => c.id === id);
      if (!existing) return;
      const updated = { ...existing, lastOpenedAt: Date.now() };
      set({ checklists: get().checklists.map((c) => (c.id === id ? updated : c)) });
      await db.put('checklists', updated);
    },

    // ---------- Tasks ----------

    createTask: async (input) => {
      const now = Date.now();
      const { tasks } = get();
      const task: Task = {
        id: uid('tk_'),
        checklistId: input.checklistId,
        parentId: input.parentId ?? null,
        title: input.title.trim() || 'Untitled task',
        notes: input.notes ?? '',
        priority: input.priority ?? 'medium',
        status: input.status ?? 'todo',
        completed: false,
        completedAt: null,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        reminderAt: input.reminderAt ?? null,
        reminderFired: false,
        tags: input.tags ?? [],
        recurrence: input.recurrence ?? null,
        order: nextOrder(tasks, input.checklistId, input.parentId ?? null),
        createdAt: now,
        updatedAt: now,
      };
      set({ tasks: [...tasks, task] });
      await db.put('tasks', task);
      await record([log('created', 'task', task.id, `Added ${task.title}`)]);
      return task;
    },

    updateTask: async (id, patch) => {
      const existing = get().tasks.find((t) => t.id === id);
      if (!existing) return;
      const updated: Task = { ...existing, ...patch, id, updatedAt: Date.now() };
      if (patch.completed !== undefined) {
        updated.completedAt = patch.completed ? patch.completedAt ?? Date.now() : null;
        updated.status = patch.completed ? 'done' : existing.status === 'done' ? 'todo' : existing.status;
      }
      if (patch.reminderAt !== undefined) updated.reminderFired = false;
      set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) });
      await db.put('tasks', updated);
    },

    deleteTask: async (id) => {
      const { tasks } = get();
      const target = tasks.find((t) => t.id === id);
      if (!target) return;
      const ids = new Set(subtreeIds(tasks, id));
      const removed = tasks.filter((t) => ids.has(t.id));
      set({
        tasks: tasks.filter((t) => !ids.has(t.id)),
        undo: {
          label:
            removed.length > 1
              ? `Deleted ${target.title} and ${removed.length - 1} subtasks`
              : `Deleted ${target.title}`,
          run: async () => {
            set({ tasks: [...get().tasks, ...removed].sort(byOrder), undo: null });
            await persistTasks(removed);
          },
        },
      });
      await db.removeMany('tasks', Array.from(ids));
      await record([log('deleted', 'task', id, `Deleted ${target.title}`)]);
    },

    toggleTask: async (id, completed) => {
      const { tasks } = get();
      const target = tasks.find((t) => t.id === id);
      if (!target) return;
      const next = completed ?? !target.completed;
      const now = Date.now();

      // Completing a parent completes everything under it; reopening leaves
      // children alone so partially-done work is not silently resurrected.
      const affected = next ? new Set(subtreeIds(tasks, id)) : new Set([id]);
      let updated = tasks.map((task) =>
        affected.has(task.id)
          ? {
              ...task,
              completed: next,
              completedAt: next ? task.completedAt ?? now : null,
              status: next ? ('done' as TaskStatus) : task.status === 'done' ? ('todo' as TaskStatus) : task.status,
              updatedAt: now,
            }
          : task,
      );

      const entries = [
        log(
          next ? 'completed' : 'reopened',
          'task',
          id,
          `${next ? 'Completed' : 'Reopened'} ${target.title}`,
        ),
      ];

      // A recurring task spawns its next occurrence when it is ticked off.
      let spawned: Task | null = null;
      if (next && target.recurrence) {
        const nextDue = nextOccurrence(target.dueDate, target.recurrence);
        let nextStart: string | null = null;
        if (target.startDate && target.dueDate && nextDue) {
          const start = fromISO(target.startDate);
          const due = fromISO(target.dueDate);
          const nd = fromISO(nextDue);
          if (start && due && nd) {
            const gap = Math.round((due.getTime() - start.getTime()) / 86_400_000);
            nextStart = toISO(addDays(nd, -gap));
          }
        } else if (target.startDate && !target.dueDate) {
          nextStart = nextOccurrence(target.startDate, target.recurrence);
        }
        spawned = {
          ...target,
          id: uid('tk_'),
          completed: false,
          completedAt: null,
          status: 'todo',
          dueDate: nextDue,
          startDate: nextStart,
          reminderFired: false,
          reminderAt: null,
          order: target.order + 0.5,
          createdAt: now,
          updatedAt: now,
        };
        updated = [...updated, spawned];
        entries.push(log('created', 'task', spawned.id, `Scheduled next ${spawned.title}`));
      }

      set({ tasks: updated.sort(byOrder) });
      const touched = updated.filter((t) => affected.has(t.id) || t.id === spawned?.id);
      await persistTasks(touched);
      await record(entries);
    },

    setStatus: async (id, status) => {
      const existing = get().tasks.find((t) => t.id === id);
      if (!existing) return;
      if (status === 'done' && !existing.completed) {
        await get().toggleTask(id, true);
        return;
      }
      if (status !== 'done' && existing.completed) {
        await get().toggleTask(id, false);
      }
      const current = get().tasks.find((t) => t.id === id) as Task;
      const updated: Task = { ...current, status, updatedAt: Date.now() };
      set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) });
      await db.put('tasks', updated);
    },

    reorderSiblings: async (checklistId, parentId, orderedIds) => {
      const index = new Map(orderedIds.map((id, i) => [id, i]));
      const updated = get().tasks.map((task) =>
        task.checklistId === checklistId && task.parentId === parentId && index.has(task.id)
          ? { ...task, order: index.get(task.id) as number, updatedAt: Date.now() }
          : task,
      );
      set({ tasks: updated.sort(byOrder) });
      await persistTasks(updated.filter((t) => index.has(t.id)));
    },

    moveTask: async (id, parentId, index) => {
      const { tasks } = get();
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      // Refuse to nest a task inside its own subtree.
      if (parentId && subtreeIds(tasks, id).includes(parentId)) return;

      const siblings = tasks
        .filter((t) => t.checklistId === task.checklistId && t.parentId === parentId && t.id !== id)
        .sort(byOrder);
      const at = index === undefined ? siblings.length : Math.max(0, Math.min(index, siblings.length));
      const reordered = [...siblings.slice(0, at), task, ...siblings.slice(at)];
      const orderMap = new Map(reordered.map((t, i) => [t.id, i]));

      const updated = tasks.map((t) => {
        if (t.id === id) {
          return { ...t, parentId, order: orderMap.get(id) as number, updatedAt: Date.now() };
        }
        return orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id) as number } : t;
      });
      set({ tasks: updated.sort(byOrder) });
      await persistTasks(updated.filter((t) => orderMap.has(t.id)));
    },

    indentTask: async (id) => {
      const { tasks } = get();
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const siblings = tasks
        .filter((t) => t.checklistId === task.checklistId && t.parentId === task.parentId)
        .sort(byOrder);
      const position = siblings.findIndex((t) => t.id === id);
      if (position <= 0) return; // nothing to nest under
      await get().moveTask(id, siblings[position - 1].id);
    },

    outdentTask: async (id) => {
      const { tasks } = get();
      const task = tasks.find((t) => t.id === id);
      if (!task?.parentId) return;
      const parent = tasks.find((t) => t.id === task.parentId);
      if (!parent) return;
      const grandparentSiblings = tasks
        .filter((t) => t.checklistId === task.checklistId && t.parentId === parent.parentId)
        .sort(byOrder);
      const at = grandparentSiblings.findIndex((t) => t.id === parent.id);
      await get().moveTask(id, parent.parentId, at + 1);
    },

    bulkComplete: async (ids, completed) => {
      const now = Date.now();
      const set$ = new Set(ids);
      const updated = get().tasks.map((task) =>
        set$.has(task.id)
          ? {
              ...task,
              completed,
              completedAt: completed ? task.completedAt ?? now : null,
              status: completed ? ('done' as TaskStatus) : task.status === 'done' ? ('todo' as TaskStatus) : task.status,
              updatedAt: now,
            }
          : task,
      );
      set({ tasks: updated });
      await persistTasks(updated.filter((t) => set$.has(t.id)));
      await record([
        log(
          completed ? 'completed' : 'reopened',
          'task',
          ids[0] ?? '',
          `${completed ? 'Completed' : 'Reopened'} ${ids.length} tasks`,
        ),
      ]);
    },

    bulkDelete: async (ids) => {
      const { tasks } = get();
      const all = new Set<string>();
      ids.forEach((id) => subtreeIds(tasks, id).forEach((child) => all.add(child)));
      const removed = tasks.filter((t) => all.has(t.id));
      if (!removed.length) return;
      set({
        tasks: tasks.filter((t) => !all.has(t.id)),
        undo: {
          label: `Deleted ${removed.length} tasks`,
          run: async () => {
            set({ tasks: [...get().tasks, ...removed].sort(byOrder), undo: null });
            await persistTasks(removed);
          },
        },
      });
      await db.removeMany('tasks', Array.from(all));
      await record([log('deleted', 'task', ids[0] ?? '', `Deleted ${removed.length} tasks`)]);
    },

    bulkPriority: async (ids, priority) => {
      const set$ = new Set(ids);
      const updated = get().tasks.map((t) =>
        set$.has(t.id) ? { ...t, priority, updatedAt: Date.now() } : t,
      );
      set({ tasks: updated });
      await persistTasks(updated.filter((t) => set$.has(t.id)));
    },

    bulkDue: async (ids, dueDate) => {
      const set$ = new Set(ids);
      const updated = get().tasks.map((t) =>
        set$.has(t.id) ? { ...t, dueDate, updatedAt: Date.now() } : t,
      );
      set({ tasks: updated });
      await persistTasks(updated.filter((t) => set$.has(t.id)));
    },

    bulkMove: async (ids, checklistId) => {
      const { tasks } = get();
      const all = new Set<string>();
      ids.forEach((id) => subtreeIds(tasks, id).forEach((child) => all.add(child)));
      const moving = tasks.filter((t) => all.has(t.id));
      let base = nextOrder(tasks, checklistId, null);
      const updated = tasks.map((task) => {
        if (!all.has(task.id)) return task;
        const keepParent = task.parentId && all.has(task.parentId);
        return {
          ...task,
          checklistId,
          parentId: keepParent ? task.parentId : null,
          order: keepParent ? task.order : base++,
          updatedAt: Date.now(),
        };
      });
      set({ tasks: updated.sort(byOrder) });
      await persistTasks(updated.filter((t) => all.has(t.id)));
      await record([
        log('updated', 'task', ids[0] ?? '', `Moved ${moving.length} tasks to another checklist`),
      ]);
    },

    // ---------- Templates ----------

    saveTemplate: async (template) => {
      const existing = get().templates.filter((t) => t.id !== template.id);
      set({ templates: [...existing, template] });
      if (!template.builtIn) await db.put('templates', template);
    },

    deleteTemplate: async (id) => {
      set({ templates: get().templates.filter((t) => t.id !== id) });
      await db.remove('templates', id);
    },

    templateFromChecklist: async (checklistId, name) => {
      const checklist = get().checklists.find((c) => c.id === checklistId);
      if (!checklist) return null;
      const tasks = get().tasks.filter((t) => t.checklistId === checklistId);

      const toTemplateTasks = (parentId: string | null): TemplateTask[] =>
        tasks
          .filter((t) => t.parentId === parentId)
          .sort(byOrder)
          .map((task) => {
            const children = toTemplateTasks(task.id);
            const entry: TemplateTask = { title: task.title, priority: task.priority };
            if (task.notes) entry.notes = task.notes;
            if (children.length) entry.children = children;
            return entry;
          });

      const template: Template = {
        id: uid('tpl_'),
        name: name.trim() || checklist.title,
        description: checklist.description,
        category: checklist.category,
        color: checklist.color,
        icon: checklist.icon,
        tasks: toTemplateTasks(null),
        builtIn: false,
        createdAt: Date.now(),
      };
      await get().saveTemplate(template);
      return template;
    },

    createFromTemplate: async (templateId, title) => {
      const template = get().templates.find((t) => t.id === templateId);
      if (!template) return null;
      const checklist = await get().createChecklist({
        title: title?.trim() || template.name,
        description: template.description,
        color: template.color,
        icon: template.icon,
        category: template.category,
      });

      const now = Date.now();
      const created: Task[] = [];
      const walk = (entries: TemplateTask[], parentId: string | null) => {
        entries.forEach((entry, index) => {
          const id = uid('tk_');
          created.push({
            id,
            checklistId: checklist.id,
            parentId,
            title: entry.title,
            notes: entry.notes ?? '',
            priority: entry.priority ?? 'medium',
            status: 'todo',
            completed: false,
            completedAt: null,
            startDate: null,
            dueDate:
              entry.dueInDays === null || entry.dueInDays === undefined
                ? null
                : toISO(addDays(new Date(), entry.dueInDays)),
            reminderAt: null,
            reminderFired: false,
            tags: [],
            recurrence: null,
            order: index,
            createdAt: now,
            updatedAt: now,
          });
          if (entry.children?.length) walk(entry.children, id);
        });
      };
      walk(template.tasks, null);

      set({ tasks: [...get().tasks, ...created] });
      await persistTasks(created);
      await record([
        log('created', 'checklist', checklist.id, `Started ${checklist.title} from a template`),
      ]);
      return checklist;
    },

    // ---------- Saved filters ----------

    saveFilter: async (name, filter) => {
      const saved: SavedFilter = {
        id: uid('f_'),
        name: name.trim() || 'Saved view',
        filter,
        createdAt: Date.now(),
      };
      set({ savedFilters: [...get().savedFilters, saved] });
      await db.put('filters', saved);
      return saved;
    },

    deleteFilter: async (id) => {
      set({ savedFilters: get().savedFilters.filter((f) => f.id !== id) });
      await db.remove('filters', id);
    },

    // ---------- Data management ----------

    importPayload: async (payload, mode) => {
      if (mode === 'replace') {
        await db.replaceAll({
          checklists: payload.checklists,
          tasks: payload.tasks,
          templates: payload.templates,
          filters: payload.savedFilters,
          activity: payload.activity,
        });
        set({
          checklists: payload.checklists.slice().sort((a, b) => a.order - b.order),
          tasks: payload.tasks.slice().sort(byOrder),
          templates: [...BUILT_IN_TEMPLATES, ...payload.templates],
          savedFilters: payload.savedFilters,
          activity: payload.activity.slice(-ACTIVITY_CAP),
        });
      } else {
        const existingLists = new Set(get().checklists.map((c) => c.id));
        const existingTasks = new Set(get().tasks.map((t) => t.id));
        const lists = payload.checklists.filter((c) => !existingLists.has(c.id));
        const tasks = payload.tasks.filter((t) => !existingTasks.has(t.id));
        const templates = payload.templates.filter(
          (t) => !get().templates.some((existing) => existing.id === t.id),
        );
        const filters = payload.savedFilters.filter(
          (f) => !get().savedFilters.some((existing) => existing.id === f.id),
        );
        set({
          checklists: [...get().checklists, ...lists].sort((a, b) => a.order - b.order),
          tasks: [...get().tasks, ...tasks].sort(byOrder),
          templates: [...get().templates, ...templates],
          savedFilters: [...get().savedFilters, ...filters],
        });
        await db.putMany('checklists', lists);
        await persistTasks(tasks);
        await db.putMany('templates', templates);
        await db.putMany('filters', filters);
      }
      await record([
        log(
          'imported',
          'data',
          'import',
          `Imported ${payload.checklists.length} checklists and ${payload.tasks.length} tasks`,
        ),
      ]);
    },

    resetAll: async () => {
      await db.replaceAll({ checklists: [], tasks: [], templates: [], filters: [], activity: [] });
      await db.clearStore('backups');
      set({
        checklists: [],
        tasks: [],
        activity: [],
        templates: BUILT_IN_TEMPLATES,
        savedFilters: [],
        undo: null,
      });
    },

    createBackup: async (automatic, keep) => {
      const state = get();
      const payload = buildPayload(state);
      const serialised = JSON.stringify(payload);
      const backup: BackupRecord = {
        id: uid('bk_'),
        createdAt: Date.now(),
        automatic,
        size: serialised.length,
        payload,
      };
      await db.put('backups', backup);
      await db.setMeta('lastBackupAt', backup.createdAt);
      const all = await db.getAll<BackupRecord>('backups');
      const stale = all
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(Math.max(1, keep))
        .map((b) => b.id);
      await db.removeMany('backups', stale);
      return backup;
    },

    listBackups: async () => {
      const all = await db.getAll<BackupRecord>('backups');
      return all.sort((a, b) => b.createdAt - a.createdAt);
    },

    restoreBackup: async (id) => {
      const backup = await db.get<BackupRecord>('backups', id);
      if (!backup) throw new Error('That backup is no longer available.');
      await get().importPayload(backup.payload, 'replace');
    },

    deleteBackup: async (id) => {
      await db.remove('backups', id);
    },
  };
});

export const selectChecklist = (id: string | undefined) => (state: DataState) =>
  state.checklists.find((c) => c.id === id);

export const selectTasksFor = (id: string | undefined) => (state: DataState) =>
  state.tasks.filter((t) => t.checklistId === id);
