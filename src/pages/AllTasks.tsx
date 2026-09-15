import { AlignJustify, List, ListTodo } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { progressOfTasks, sortTasks, taskMatches } from '@/lib/tasks';
import { Button, EmptyState, Segmented } from '@/components/ui/primitives';
import { FilterBar } from '@/components/tasks/FilterBar';
import { TaskRow } from '@/components/tasks/TaskRow';
import { TaskDialog, blankDraft, draftFromTask, type TaskDraft } from '@/components/tasks/TaskDialog';
import { CompactView } from '@/components/views/CompactView';
import { useData } from '@/store/useData';
import { useUI } from '@/store/useUI';

export default function AllTasks() {
  const checklists = useData((state) => state.checklists);
  const allTasks = useData((state) => state.tasks);
  const filter = useUI((state) => state.filter);
  const [layout, setLayout] = useState<'rows' | 'compact'>('rows');
  const [draft, setDraft] = useState<TaskDraft | null>(null);

  const liveLists = useMemo(() => checklists.filter((list) => !list.archived), [checklists]);
  const names = useMemo(
    () => new Map(checklists.map((list) => [list.id, list.title])),
    [checklists],
  );

  const results = useMemo(() => {
    const liveIds = new Set(liveLists.map((list) => list.id));
    const byList = new Map(checklists.map((list) => [list.id, list]));
    const matched = allTasks.filter(
      (task) => liveIds.has(task.checklistId) && taskMatches(task, filter, byList.get(task.checklistId)),
    );
    return sortTasks(matched, filter.sort === 'manual' ? 'smart' : filter.sort);
  }, [allTasks, liveLists, checklists, filter]);

  const progress = progressOfTasks(results);

  const openEdit = (taskId: string) => {
    const task = allTasks.find((candidate) => candidate.id === taskId);
    if (task) setDraft(draftFromTask(task));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-limestone">All tasks</h1>
          <p className="mt-0.5 text-sm text-steel">
            {results.length} {results.length === 1 ? 'task' : 'tasks'} across {liveLists.length}{' '}
            {liveLists.length === 1 ? 'checklist' : 'checklists'}
            {progress.overdue ? ` · ${progress.overdue} overdue` : ''}
          </p>
        </div>
        <Segmented
          ariaLabel="Change layout"
          value={layout}
          onChange={setLayout}
          options={[
            { value: 'rows', label: 'Rows', icon: <List size={14} /> },
            { value: 'compact', label: 'Table', icon: <AlignJustify size={14} /> },
          ]}
        />
      </div>

      <FilterBar showCategories />

      {results.length === 0 ? (
        <EmptyState
          icon={<ListTodo size={26} />}
          title="No matching tasks"
          body={
            allTasks.length
              ? 'Nothing matches the current filters. Clearing them will show everything again.'
              : 'Add tasks to a checklist and they will all be searchable from here.'
          }
          action={
            <Link to="/checklists">
              <Button variant="primary">Go to checklists</Button>
            </Link>
          }
        />
      ) : layout === 'compact' ? (
        <CompactView tasks={results} onEdit={openEdit} checklistNames={names} />
      ) : (
        <div className="space-y-0.5">
          {results.map((task) => (
            <TaskRow
              key={task.id}
              node={{
                task,
                depth: 0,
                children: [],
                subProgress: { total: 0, done: 0, open: 0, overdue: 0, percent: 0 },
              }}
              draggable={false}
              showChecklistName={names.get(task.checklistId)}
              onEdit={openEdit}
              onAddSubtask={(parentId) => {
                const parent = allTasks.find((candidate) => candidate.id === parentId);
                if (parent) setDraft(blankDraft(parent.checklistId, parentId));
              }}
            />
          ))}
        </div>
      )}

      <TaskDialog draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
