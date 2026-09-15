import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { COLORS, ICONS } from '@/lib/palette';
import { uniqueCategories, uniqueTags } from '@/lib/tasks';
import { Button } from '@/components/ui/primitives';
import { Field, Input, Select, TagInput, Textarea } from '@/components/ui/fields';
import { Modal } from '@/components/ui/Modal';
import { useData } from '@/store/useData';
import { useToasts } from '@/store/useToasts';
import type { Checklist, ColorKey, IconKey, ViewMode } from '@/types';

export interface ChecklistDraft {
  id?: string;
  title: string;
  description: string;
  color: ColorKey;
  icon: IconKey;
  category: string;
  tags: string[];
  defaultView: ViewMode | null;
}

export function blankChecklistDraft(): ChecklistDraft {
  return {
    title: '',
    description: '',
    color: 'copper',
    icon: 'checklist',
    category: '',
    tags: [],
    defaultView: null,
  };
}

export function checklistDraftFrom(checklist: Checklist): ChecklistDraft {
  return {
    id: checklist.id,
    title: checklist.title,
    description: checklist.description,
    color: checklist.color,
    icon: checklist.icon,
    category: checklist.category,
    tags: checklist.tags,
    defaultView: checklist.defaultView,
  };
}

export function ChecklistDialog({
  draft,
  onClose,
  onCreated,
}: {
  draft: ChecklistDraft | null;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const checklists = useData((state) => state.checklists);
  const tasks = useData((state) => state.tasks);
  const createChecklist = useData((state) => state.createChecklist);
  const updateChecklist = useData((state) => state.updateChecklist);
  const push = useToasts((state) => state.push);
  const [form, setForm] = useState<ChecklistDraft | null>(draft);
  const [busy, setBusy] = useState(false);

  useEffect(() => setForm(draft), [draft]);

  const categories = useMemo(() => uniqueCategories(checklists), [checklists]);
  const tagSuggestions = useMemo(() => uniqueTags(tasks, checklists), [tasks, checklists]);

  if (!form) return null;
  const patch = (next: Partial<ChecklistDraft>) => setForm({ ...form, ...next });

  const save = async () => {
    if (!form.title.trim() || busy) return;
    setBusy(true);
    try {
      if (form.id) {
        await updateChecklist(form.id, {
          title: form.title.trim(),
          description: form.description,
          color: form.color,
          icon: form.icon,
          category: form.category.trim(),
          tags: form.tags,
          defaultView: form.defaultView,
        });
        push('Checklist updated.', { tone: 'success' });
      } else {
        const created = await createChecklist({
          title: form.title,
          description: form.description,
          color: form.color,
          icon: form.icon,
          category: form.category,
          tags: form.tags,
          defaultView: form.defaultView,
        });
        push('Checklist created.', { tone: 'success' });
        onCreated?.(created.id);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={form.id ? 'Edit checklist' : 'New checklist'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!form.title.trim() || busy}>
            {form.id ? 'Save changes' : 'Create checklist'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input
            autoFocus
            value={form.title}
            onChange={(event) => patch({ title: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void save();
            }}
            placeholder="Release 2.4, Kitchen renovation, Weekly reset…"
          />
        </Field>

        <Field label="Description" hint="Optional. Shown on the checklist card.">
          <Textarea
            value={form.description}
            onChange={(event) => patch({ description: event.target.value })}
            className="min-h-[68px]"
            placeholder="What is this list for?"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" hint="Groups checklists in analytics and filters.">
            <Input
              list="category-suggestions"
              value={form.category}
              onChange={(event) => patch({ category: event.target.value })}
              placeholder="Work, Personal, Routine…"
            />
            <datalist id="category-suggestions">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </Field>

          <Field label="Opens in" hint="Leave on default to follow your Settings choice.">
            <Select
              value={form.defaultView ?? ''}
              onChange={(event) =>
                patch({ defaultView: (event.target.value || null) as ViewMode | null })
              }
            >
              <option value="">Default view</option>
              <option value="list">List</option>
              <option value="kanban">Kanban</option>
              <option value="calendar">Calendar</option>
              <option value="timeline">Timeline</option>
              <option value="compact">Compact</option>
            </Select>
          </Field>
        </div>

        <Field label="Tags">
          <TagInput tags={form.tags} onChange={(tags) => patch({ tags })} suggestions={tagSuggestions} />
        </Field>

        <Field label="Colour">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-label={option.label}
                aria-pressed={form.color === option.key}
                onClick={() => patch({ color: option.key })}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition-transform',
                  form.color === option.key ? 'scale-110 border-limestone' : 'border-transparent',
                )}
                style={{ backgroundColor: option.hex }}
              />
            ))}
          </div>
        </Field>

        <Field label="Icon">
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={form.icon === key}
                onClick={() => patch({ icon: key })}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-control border transition-colors',
                  form.icon === key
                    ? 'border-copper/60 bg-copper/12 text-copper'
                    : 'text-steel hover:text-limestone',
                )}
              >
                <Icon size={17} />
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
