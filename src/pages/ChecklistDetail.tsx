import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  Download,
  LayoutGrid,
  List,
  Plus,
  AlignJustify,
  Star,
  Pin,
  Pencil,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { color as colorOf, icon as iconOf } from '@/lib/palette';
import { progressOfTasks, sortTasks, taskMatches } from '@/lib/tasks';
import { download, stamp, tasksToCSV } from '@/lib/transfer';
import { Badge, Button, EmptyState, ProgressBar, Segmented } from '@/components/ui/primitives';
import { FilterBar } from '@/components/tasks/FilterBar';
import {
  TaskDialog,
  blankDraft,
  draftFromTask,
  type TaskDraft,
} from '@/components/tasks/TaskDialog';
import { Input } from '@/components/ui/fields';
import { ListView } from '@/components/views/ListView';
import { KanbanView } from '@/components/views/KanbanView';
import { CalendarView } from '@/components/views/CalendarView';
import { TimelineView } from '@/components/views/TimelineView';
import { CompactView } from '@/components/views/CompactView';
import {
  ChecklistDialog,
  checklistDraftFrom,
  type ChecklistDraft,
} from '@/components/checklists/ChecklistDialog';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import { useToasts } from '@/store/useToasts';
import { useUI } from '@/store/useUI';
import type { ViewMode } from '@/types';

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: JSX.Element }[] = [
  { value: 'list', label: 'List', icon: <List size={14} /> },
  { value: 'kanban', label: 'Board', icon: <LayoutGrid size={14} /> },
  { value: 'calendar', label: 'Calendar', icon: <CalendarDays size={14} /> },
  { value: 'timeline', label: 'Timeline', icon: <BarChart3 size={14} /> },
  { value: 'compact', label: 'Compact', icon: <AlignJustify size={14} /> },
];

export default function ChecklistDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const checklists = useData((state) => state.checklists);
  const allTasks = useData((state) => state.tasks);
  const createTask = useData((state) => state.createTask);
  const updateChecklist = useData((state) => state.updateChecklist);
  const touchChecklist = useData((state) => state.touchChecklist);
  const defaultView = usePrefs((state) => state.defaultView);
  const filter = useUI((state) => state.filter);
  const resetFilter = useUI((state) => state.resetFilter);
  const clearSelection = useUI((state) => state.clearSelection);
  const push = useToasts((state) => state.push);

  const [view, setView] = useState<ViewMode | null>(null);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [editing, setEditing] = useState<ChecklistDraft | null>(null);
  const [quickTitle, setQuickTitle] = useState('');

  const checklist = checklists.find((candidate) => candidate.id === id);

  useEffect(() => {
    if (id) void touchChecklist(id);
    resetFilter();
    clearSelection();
    setView(null);
  }, [id, touchChecklist, resetFilter, clearSelection]);

  // ?task=<id> deep link, used by the command palette.
  useEffect(() => {
    const taskId = params.get('task');
    if (!taskId) return;
    const task = allTasks.find((candidate) => candidate.id === taskId);
    if (task) setDraft(draftFromTask(task));
    params.delete('task');
    setParams(params, { replace: true });
  }, [params, setParams, allTasks]);

  const tasks = useMemo(
    () => allTasks.filter((task) => task.checklistId === id),
    [allTasks, id],
  );

  const filtered = useMemo(
    () => tasks.filter((task) => taskMatches(task, filter, checklist)),
    [tasks, filter, checklist],
  );

  const progress = useMemo(() => progressOfTasks(tasks), [tasks]);
  const activeView: ViewMode = view ?? checklist?.defaultView ?? defaultView;

  if (!checklist) {
    return (
      <EmptyState
        title="That checklist is gone"
        body="It may have been deleted on this device. Head back and pick another."
        action={
          <Link to="/checklists">
            <Button variant="primary">Back to checklists</Button>
          </Link>
        }
      />
    );
  }

  const spec = colorOf(checklist.color);
  const Icon = iconOf(checklist.icon);

  const addQuick = async () => {
    const title = quickTitle.trim();
    if (!title) return;
    setQuickTitle('');
    await createTask({ checklistId: checklist.id, title });
  };

  const openEdit = (taskId: string) => {
    const task = allTasks.find((candidate) => candidate.id === taskId);
    if (task) setDraft(draftFromTask(task));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-steel">
        <Button size="sm" variant="ghost" onClick={() => navigate('/checklists')}>
          <ChevronLeft size={15} />
          Checklists
        </Button>
      </div>

      <header className="panel overflow-hidden">
        <div className="flex flex-wrap items-start gap-4 p-4">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-control"
            style={{ backgroundColor: `${spec.hex}22`, color: spec.hex }}
          >
            <Icon size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl leading-snug text-limestone">{checklist.title}</h1>
            {checklist.description ? (
              <p className="mt-1 text-sm leading-relaxed text-steel">{checklist.description}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {checklist.category ? (
                <Badge className={cn('border-transparent', spec.tint, spec.text)}>
                  {checklist.category}
                </Badge>
              ) : null}
              {checklist.tags.map((tag) => (
                <Badge key={tag} className="border-hairline text-steel">
                  #{tag}
                </Badge>
              ))}
              <span className="tabular text-2xs text-steel">
                {progress.done}/{progress.total} done
                {progress.overdue ? ` · ${progress.overdue} overdue` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label={checklist.pinned ? 'Unpin checklist' : 'Pin checklist'}
              onClick={() => void updateChecklist(checklist.id, { pinned: !checklist.pinned })}
            >
              <Pin size={16} className={checklist.pinned ? 'text-copper' : ''} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={checklist.favorite ? 'Remove favourite' : 'Mark favourite'}
              onClick={() => void updateChecklist(checklist.id, { favorite: !checklist.favorite })}
            >
              <Star size={16} className={checklist.favorite ? 'fill-copper text-copper' : ''} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Export this checklist as CSV"
              onClick={() => {
                download(
                  `${checklist.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${stamp()}.csv`,
                  tasksToCSV([checklist], tasks),
                  'text/csv',
                );
                push('Exported this checklist as CSV.', { tone: 'success' });
              }}
            >
              <Download size={16} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Edit checklist"
              onClick={() => setEditing(checklistDraftFrom(checklist))}
            >
              <Pencil size={15} />
            </Button>
          </div>
        </div>
        <div className="px-4 pb-4">
          <ProgressBar percent={progress.percent} label={`${checklist.title} progress`} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Change view"
          value={activeView}
          onChange={(next) => setView(next)}
          options={VIEW_OPTIONS}
        />
        <Button size="sm" variant="secondary" onClick={() => setDraft(blankDraft(checklist.id))}>
          <Plus size={14} />
          Task with details
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={quickTitle}
          onChange={(event) => setQuickTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void addQuick();
          }}
          placeholder="Add a task and press Enter"
          aria-label="Quick add a task to this checklist"
        />
        <Button variant="primary" onClick={addQuick} disabled={!quickTitle.trim()}>
          Add
        </Button>
      </div>

      <FilterBar />

      {activeView === 'list' ? (
        <ListView
          checklistId={checklist.id}
          tasks={filtered}
          manualOrder={filter.sort === 'manual'}
          onEdit={openEdit}
          onAddSubtask={(parentId) => setDraft(blankDraft(checklist.id, parentId))}
          emptyAction={
            <Button variant="primary" onClick={() => setDraft(blankDraft(checklist.id))}>
              <Plus size={16} />
              Add a task
            </Button>
          }
        />
      ) : null}

      {activeView === 'kanban' ? (
        <KanbanView
          tasks={sortTasks(filtered, filter.sort === 'manual' ? 'manual' : filter.sort)}
          onEdit={openEdit}
          onAdd={() => setDraft(blankDraft(checklist.id))}
        />
      ) : null}

      {activeView === 'calendar' ? (
        <CalendarView
          tasks={filtered}
          onEdit={openEdit}
          onAddOn={(iso) => setDraft({ ...blankDraft(checklist.id), dueDate: iso })}
        />
      ) : null}

      {activeView === 'timeline' ? <TimelineView tasks={filtered} onEdit={openEdit} /> : null}

      {activeView === 'compact' ? (
        <CompactView tasks={sortTasks(filtered, filter.sort)} onEdit={openEdit} />
      ) : null}

      <TaskDialog draft={draft} onClose={() => setDraft(null)} />
      <ChecklistDialog draft={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
