import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ListChecks, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { uniqueCategories } from '@/lib/tasks';
import { Button, EmptyState, Segmented } from '@/components/ui/primitives';
import { Input, Select } from '@/components/ui/fields';
import { Modal } from '@/components/ui/Modal';
import { ChecklistCard } from '@/components/checklists/ChecklistCard';
import {
  ChecklistDialog,
  blankChecklistDraft,
  checklistDraftFrom,
  type ChecklistDraft,
} from '@/components/checklists/ChecklistDialog';
import { useData } from '@/store/useData';
import { useToasts } from '@/store/useToasts';

type Grouping = 'all' | 'favorites' | 'pinned';
type Order = 'manual' | 'recent' | 'progress' | 'alpha';

export default function Checklists() {
  const checklists = useData((state) => state.checklists);
  const tasks = useData((state) => state.tasks);
  const reorderChecklists = useData((state) => state.reorderChecklists);
  const templateFromChecklist = useData((state) => state.templateFromChecklist);
  const push = useToasts((state) => state.push);
  const [params, setParams] = useSearchParams();

  const [draft, setDraft] = useState<ChecklistDraft | null>(null);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Grouping>('all');
  const [order, setOrder] = useState<Order>('manual');
  const [category, setCategory] = useState('');
  const [templateFor, setTemplateFor] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');

  // ?new=1 opens the create dialog (used by the sidebar and shortcuts).
  useEffect(() => {
    if (params.get('new')) {
      setDraft(blankChecklistDraft());
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const categories = useMemo(() => uniqueCategories(checklists), [checklists]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const progressOf = (id: string) => {
      const own = tasks.filter((task) => task.checklistId === id);
      return own.length ? own.filter((task) => task.completed).length / own.length : 0;
    };

    let list = checklists.filter((checklist) => !checklist.archived);
    if (group === 'favorites') list = list.filter((checklist) => checklist.favorite);
    if (group === 'pinned') list = list.filter((checklist) => checklist.pinned);
    if (category) list = list.filter((checklist) => checklist.category === category);
    if (needle) {
      list = list.filter((checklist) =>
        `${checklist.title} ${checklist.description} ${checklist.category} ${checklist.tags.join(' ')}`
          .toLowerCase()
          .includes(needle),
      );
    }

    const sorted = list.slice();
    if (order === 'recent') {
      sorted.sort((a, b) => (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt));
    } else if (order === 'progress') {
      sorted.sort((a, b) => progressOf(b.id) - progressOf(a.id));
    } else if (order === 'alpha') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || a.order - b.order,
      );
    }
    return sorted;
  }, [checklists, tasks, query, group, order, category]);

  const dragEnabled = order === 'manual' && !query && !category && group === 'all';

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = visible.map((checklist) => checklist.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const next = ids.slice();
    next.splice(from, 1);
    next.splice(to, 0, String(active.id));
    void reorderChecklists(next);
  };

  const grid = (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map((checklist) => (
        <ChecklistCard
          key={checklist.id}
          checklist={checklist}
          draggable={dragEnabled}
          onEdit={(id) => {
            const target = checklists.find((candidate) => candidate.id === id);
            if (target) setDraft(checklistDraftFrom(target));
          }}
          onSaveAsTemplate={(id) => {
            setTemplateFor(id);
            setTemplateName(checklists.find((candidate) => candidate.id === id)?.title ?? '');
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-limestone">Checklists</h1>
          <p className="mt-0.5 text-sm text-steel">
            {visible.length} of {checklists.filter((checklist) => !checklist.archived).length} shown
            {dragEnabled ? ' · drag a card to reorder' : ''}
          </p>
        </div>
        <Button variant="primary" onClick={() => setDraft(blankChecklistDraft())}>
          <Plus size={16} />
          New checklist
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search checklists"
          aria-label="Search checklists"
          className="h-9 max-w-xs"
        />
        <Segmented
          ariaLabel="Filter checklists"
          value={group}
          onChange={setGroup}
          options={[
            { value: 'all', label: 'All' },
            { value: 'favorites', label: 'Favourites' },
            { value: 'pinned', label: 'Pinned' },
          ]}
        />
        {categories.length ? (
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-9 w-auto"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        ) : null}
        <Select
          value={order}
          onChange={(event) => setOrder(event.target.value as Order)}
          className="h-9 w-auto"
          aria-label="Order checklists"
        >
          <option value="manual">Manual order</option>
          <option value="recent">Recently opened</option>
          <option value="progress">Most complete</option>
          <option value="alpha">A to Z</option>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={26} />}
          title={checklists.length ? 'No checklists match' : 'No checklists yet'}
          body={
            checklists.length
              ? 'Adjust the filters above, or check the archive for lists you have put away.'
              : 'Create one from scratch, or start from a template to get a head start.'
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={() => setDraft(blankChecklistDraft())}>
                <Plus size={16} />
                New checklist
              </Button>
              <Link to="/templates">
                <Button>Browse templates</Button>
              </Link>
            </div>
          }
        />
      ) : dragEnabled ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((checklist) => checklist.id)} strategy={rectSortingStrategy}>
            {grid}
          </SortableContext>
        </DndContext>
      ) : (
        grid
      )}

      <ChecklistDialog draft={draft} onClose={() => setDraft(null)} />

      <Modal
        open={Boolean(templateFor)}
        onClose={() => setTemplateFor(null)}
        title="Save as template"
        description="Task titles, notes, priorities and nesting are kept. Dates are not."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTemplateFor(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!templateName.trim()}
              onClick={() => {
                if (!templateFor) return;
                void templateFromChecklist(templateFor, templateName).then(() =>
                  push('Template saved.', { tone: 'success' }),
                );
                setTemplateFor(null);
              }}
            >
              Save template
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          value={templateName}
          onChange={(event) => setTemplateName(event.target.value)}
          aria-label="Template name"
          placeholder="Template name"
        />
      </Modal>
    </div>
  );
}
