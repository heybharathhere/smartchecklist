import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/primitives';
import { Field, Input, Select, TagInput, Textarea } from '@/components/ui/fields';
import { Modal } from '@/components/ui/Modal';
import { describeRecurrence } from '@/lib/date';
import { PRIORITIES, STATUSES } from '@/lib/palette';
import { uniqueTags } from '@/lib/tasks';
import { useData } from '@/store/useData';
import { useToasts } from '@/store/useToasts';
import type { Priority, Recurrence, RecurrenceFreq, Task, TaskStatus } from '@/types';

export interface TaskDraft {
  id?: string;
  checklistId: string;
  parentId: string | null;
  title: string;
  notes: string;
  priority: Priority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  reminder: string;
  tags: string[];
  recurrence: Recurrence | null;
}

const WEEKDAYS = [
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
  { value: 0, label: 'S' },
];

export function blankDraft(checklistId: string, parentId: string | null = null): TaskDraft {
  return {
    checklistId,
    parentId,
    title: '',
    notes: '',
    priority: 'medium',
    status: 'todo',
    startDate: '',
    dueDate: '',
    reminder: '',
    tags: [],
    recurrence: null,
  };
}

export function draftFromTask(task: Task): TaskDraft {
  return {
    id: task.id,
    checklistId: task.checklistId,
    parentId: task.parentId,
    title: task.title,
    notes: task.notes,
    priority: task.priority,
    status: task.status,
    startDate: task.startDate ?? '',
    dueDate: task.dueDate ?? '',
    reminder: task.reminderAt ? format(new Date(task.reminderAt), "yyyy-MM-dd'T'HH:mm") : '',
    tags: task.tags,
    recurrence: task.recurrence,
  };
}

export function TaskDialog({
  draft,
  onClose,
}: {
  draft: TaskDraft | null;
  onClose: () => void;
}) {
  const checklists = useData((state) => state.checklists);
  const tasks = useData((state) => state.tasks);
  const createTask = useData((state) => state.createTask);
  const updateTask = useData((state) => state.updateTask);
  const push = useToasts((state) => state.push);
  const [form, setForm] = useState<TaskDraft | null>(draft);
  const [busy, setBusy] = useState(false);

  useEffect(() => setForm(draft), [draft]);

  const tagSuggestions = useMemo(() => uniqueTags(tasks, checklists), [tasks, checklists]);
  const parentTitle = form?.parentId
    ? tasks.find((task) => task.id === form.parentId)?.title
    : undefined;

  if (!form) return null;
  const patch = (next: Partial<TaskDraft>) => setForm({ ...form, ...next });

  const save = async () => {
    if (!form.title.trim() || busy) return;
    setBusy(true);
    try {
      const reminderAt = form.reminder ? new Date(form.reminder).getTime() : null;
      const payload = {
        title: form.title.trim(),
        notes: form.notes,
        priority: form.priority,
        status: form.status,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        reminderAt: Number.isFinite(reminderAt as number) ? reminderAt : null,
        tags: form.tags,
        recurrence: form.recurrence,
      };
      if (form.id) {
        await updateTask(form.id, payload);
        push('Task updated.', { tone: 'success' });
      } else {
        await createTask({ checklistId: form.checklistId, parentId: form.parentId, ...payload });
        push('Task added.', { tone: 'success' });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const rule = form.recurrence;

  return (
    <Modal
      open
      onClose={onClose}
      title={form.id ? 'Edit task' : parentTitle ? 'Add a subtask' : 'Add a task'}
      description={parentTitle ? `Nested under “${parentTitle}”` : undefined}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!form.title.trim() || busy}>
            {form.id ? 'Save changes' : 'Add task'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title">
          <Input
            autoFocus
            value={form.title}
            onChange={(event) => patch({ title: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void save();
            }}
            placeholder="What needs doing?"
          />
        </Field>

        <Field label="Notes" hint="Line breaks are kept, so steps and links stay readable.">
          <Textarea
            value={form.notes}
            onChange={(event) => patch({ notes: event.target.value })}
            placeholder="Context, links, acceptance criteria…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Priority">
            <Select
              value={form.priority}
              onChange={(event) => patch({ priority: event.target.value as Priority })}
            >
              {PRIORITIES.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(event) => patch({ status: event.target.value as TaskStatus })}
            >
              {STATUSES.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Start date">
            <Input
              type="date"
              value={form.startDate}
              max={form.dueDate || undefined}
              onChange={(event) => patch({ startDate: event.target.value })}
            />
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={form.dueDate}
              min={form.startDate || undefined}
              onChange={(event) => patch({ dueDate: event.target.value })}
            />
          </Field>
        </div>

        <Field
          label="Reminder"
          hint="Fires while the app is open, and needs notifications turned on in Settings."
        >
          <Input
            type="datetime-local"
            value={form.reminder}
            onChange={(event) => patch({ reminder: event.target.value })}
          />
        </Field>

        <Field label="Tags">
          <TagInput
            tags={form.tags}
            onChange={(tags) => patch({ tags })}
            suggestions={tagSuggestions}
          />
        </Field>

        <div className="rounded-control border p-3">
          <Field label="Repeat" hint={describeRecurrence(rule)}>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={rule?.freq ?? 'none'}
                onChange={(event) => {
                  const value = event.target.value;
                  patch({
                    recurrence:
                      value === 'none'
                        ? null
                        : { freq: value as RecurrenceFreq, interval: rule?.interval ?? 1, weekdays: rule?.weekdays },
                  });
                }}
                className="w-auto"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
              {rule ? (
                <label className="flex items-center gap-2 text-sm text-steel">
                  every
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={rule.interval}
                    onChange={(event) =>
                      patch({
                        recurrence: { ...rule, interval: Math.max(1, Number(event.target.value) || 1) },
                      })
                    }
                    className="h-9 w-16"
                    aria-label="Repeat interval"
                  />
                  {rule.freq === 'daily' ? 'days' : rule.freq === 'weekly' ? 'weeks' : 'months'}
                </label>
              ) : null}
            </div>
          </Field>

          {rule?.freq === 'weekly' ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day, index) => {
                const selected = rule.weekdays?.includes(day.value) ?? false;
                return (
                  <button
                    key={`${day.value}-${index}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const current = rule.weekdays ?? [];
                      patch({
                        recurrence: {
                          ...rule,
                          weekdays: selected
                            ? current.filter((value) => value !== day.value)
                            : [...current, day.value],
                        },
                      });
                    }}
                    className={
                      selected
                        ? 'h-8 w-8 rounded-full border border-copper/60 bg-copper/15 text-sm text-copper'
                        : 'h-8 w-8 rounded-full border text-sm text-steel hover:text-limestone'
                    }
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {rule ? (
            <p className="mt-2.5 text-2xs text-steel">
              When you tick this task off, the next one is created automatically.
            </p>
          ) : null}
        </div>

        {form.id ? (
          <Field label="Checklist">
            <Select value={form.checklistId} disabled>
              {checklists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>
    </Modal>
  );
}
