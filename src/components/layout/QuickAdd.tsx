import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button } from '@/components/ui/primitives';
import { Field, Input, Select } from '@/components/ui/fields';
import { Modal } from '@/components/ui/Modal';
import { addDays, toISO } from '@/lib/date';
import { priority as prioritySpec } from '@/lib/palette';
import { useData } from '@/store/useData';
import { useToasts } from '@/store/useToasts';
import { useUI } from '@/store/useUI';
import type { Priority } from '@/types';

interface Parsed {
  title: string;
  priority: Priority | null;
  dueDate: string | null;
  tags: string[];
}

/** `!high` sets priority, `#tag` adds a tag, `@today` / `@2026-03-04` sets a due date. */
export function parseQuickAdd(input: string): Parsed {
  const tags: string[] = [];
  let priority: Priority | null = null;
  let dueDate: string | null = null;

  const words = input.split(/\s+/).filter(Boolean);
  const kept: string[] = [];

  for (const word of words) {
    const lower = word.toLowerCase();
    if (lower.startsWith('!')) {
      const value = lower.slice(1);
      const match = (['critical', 'high', 'medium', 'low'] as Priority[]).find((p) =>
        p.startsWith(value),
      );
      if (match) {
        priority = match;
        continue;
      }
    }
    if (word.startsWith('#') && word.length > 1) {
      tags.push(word.slice(1));
      continue;
    }
    if (lower.startsWith('@') && lower.length > 1) {
      const value = lower.slice(1);
      if (value === 'today') {
        dueDate = toISO(new Date());
        continue;
      }
      if (value === 'tomorrow') {
        dueDate = toISO(addDays(new Date(), 1));
        continue;
      }
      if (value === 'week') {
        dueDate = toISO(addDays(new Date(), 7));
        continue;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        dueDate = value;
        continue;
      }
    }
    kept.push(word);
  }

  return { title: kept.join(' '), priority, dueDate, tags };
}

export function QuickAdd() {
  const open = useUI((state) => state.quickAddOpen);
  const setOpen = useUI((state) => state.setQuickAddOpen);
  const checklists = useData((state) => state.checklists);
  const createTask = useData((state) => state.createTask);
  const createChecklist = useData((state) => state.createChecklist);
  const push = useToasts((state) => state.push);
  const params = useParams();
  const navigate = useNavigate();
  const [raw, setRaw] = useState('');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  const live = useMemo(
    () =>
      checklists
        .filter((list) => !list.archived)
        .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0)),
    [checklists],
  );

  useEffect(() => {
    if (!open) return;
    setRaw('');
    const fromRoute = params.id && live.some((list) => list.id === params.id) ? params.id : '';
    setTarget(fromRoute || live[0]?.id || '');
  }, [open, live, params.id]);

  const parsed = useMemo(() => parseQuickAdd(raw), [raw]);

  const submit = async () => {
    if (!parsed.title.trim() || busy) return;
    setBusy(true);
    try {
      let checklistId = target;
      if (!checklistId) {
        const created = await createChecklist({ title: 'Inbox', icon: 'checklist', category: 'Inbox' });
        checklistId = created.id;
      }
      await createTask({
        checklistId,
        title: parsed.title,
        priority: parsed.priority ?? 'medium',
        dueDate: parsed.dueDate,
        tags: parsed.tags,
      });
      push('Task added.', { tone: 'success' });
      setOpen(false);
      if (!target) navigate(`/checklists/${checklistId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Add a task"
      description="Type naturally — shorthand is picked up as you go."
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!parsed.title.trim() || busy}>
            Add task
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Task" hint="Shorthand: !high for priority, #tag for a tag, @today or @2026-03-04 for a due date.">
          <Input
            autoFocus
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="Draft the release notes !high @tomorrow #docs"
          />
        </Field>

        {parsed.priority || parsed.dueDate || parsed.tags.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {parsed.priority ? (
              <Badge className={prioritySpec(parsed.priority).className} dot={prioritySpec(parsed.priority).dot}>
                {prioritySpec(parsed.priority).label}
              </Badge>
            ) : null}
            {parsed.dueDate ? (
              <Badge className="border-hairline text-steel">Due {parsed.dueDate}</Badge>
            ) : null}
            {parsed.tags.map((tag) => (
              <Badge key={tag} className="border-hairline text-steel">
                #{tag}
              </Badge>
            ))}
          </div>
        ) : null}

        <Field label="Checklist">
          <Select value={target} onChange={(event) => setTarget(event.target.value)}>
            {live.length === 0 ? <option value="">Create an Inbox checklist</option> : null}
            {live.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
