import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { overview as buildOverview } from '@/lib/stats';
import { Button, EmptyState, Switch } from '@/components/ui/primitives';
import { Menu } from '@/components/ui/Menu';
import {
  CategoryBreakdown,
  CompletionHeatmap,
  RecentActivity,
  StatCards,
  StreakCard,
  TodayCard,
  UpcomingWidget,
} from '@/components/dashboard/widgets';
import { TaskDialog, draftFromTask, type TaskDraft } from '@/components/tasks/TaskDialog';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import { useUI } from '@/store/useUI';
import type { DashboardWidget } from '@/types';

const WIDGET_LABELS: { key: DashboardWidget; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'streak', label: 'Streak' },
  { key: 'upcoming', label: 'Coming up' },
  { key: 'heatmap', label: 'Heatmap' },
  { key: 'breakdown', label: 'By category' },
  { key: 'activity', label: 'Recent activity' },
];

export default function Dashboard() {
  const checklists = useData((state) => state.checklists);
  const tasks = useData((state) => state.tasks);
  const activity = useData((state) => state.activity);
  const weekStartsOn = usePrefs((state) => state.weekStartsOn);
  const widgets = usePrefs((state) => state.widgets);
  const toggleWidget = usePrefs((state) => state.toggleWidget);
  const toggleFocusMode = useUI((state) => state.toggleFocusMode);
  const setQuickAddOpen = useUI((state) => state.setQuickAddOpen);
  const [draft, setDraft] = useState<TaskDraft | null>(null);

  const liveTasks = useMemo(() => {
    const archived = new Set(checklists.filter((list) => list.archived).map((list) => list.id));
    return tasks.filter((task) => !archived.has(task.checklistId));
  }, [tasks, checklists]);

  const stats = useMemo(
    () => buildOverview(checklists, tasks, weekStartsOn),
    [checklists, tasks, weekStartsOn],
  );

  const openEdit = (taskId: string) => {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (task) setDraft(draftFromTask(task));
  };

  if (!checklists.length) {
    return (
      <EmptyState
        title="Start with a checklist"
        body="Everything lives on this device — no account, no sync, no server. Make your first checklist and add a few tasks."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/checklists?new=1">
              <Button variant="primary">
                <Plus size={16} />
                New checklist
              </Button>
            </Link>
            <Link to="/templates">
              <Button>Start from a template</Button>
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-limestone">Dashboard</h1>
          <p className="mt-0.5 text-sm text-steel">
            {stats.percent}% of everything is done across {stats.checklists}{' '}
            {stats.checklists === 1 ? 'checklist' : 'checklists'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Menu
            label="Choose widgets"
            items={WIDGET_LABELS.map((widget) => ({
              label: `${widgets[widget.key] ? '✓ ' : ''}${widget.label}`,
              onSelect: () => toggleWidget(widget.key),
            }))}
            trigger={({ toggle }) => (
              <Button size="sm" variant="secondary" onClick={toggle}>
                <SlidersHorizontal size={14} />
                <span className="hidden sm:inline">Widgets</span>
              </Button>
            )}
          />
          <Button size="sm" variant="primary" onClick={() => setQuickAddOpen(true)}>
            <Plus size={15} />
            <span className="hidden sm:inline">Add task</span>
          </Button>
        </div>
      </div>

      <StatCards overview={stats} />

      {widgets.today ? <TodayCard overview={stats} onFocus={toggleFocusMode} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {widgets.upcoming ? (
          <UpcomingWidget tasks={liveTasks} checklists={checklists} onEdit={openEdit} />
        ) : null}
        <div className="space-y-4">
          {widgets.streak ? <StreakCard tasks={liveTasks} /> : null}
          {widgets.breakdown ? <CategoryBreakdown checklists={checklists} tasks={tasks} /> : null}
        </div>
      </div>

      {widgets.heatmap ? <CompletionHeatmap tasks={liveTasks} /> : null}
      {widgets.activity ? <RecentActivity activity={activity} /> : null}

      {/* Hidden-widget hint keeps the customisation discoverable without clutter. */}
      {WIDGET_LABELS.some((widget) => !widgets[widget.key]) ? (
        <p className="text-2xs text-steel">
          Some widgets are hidden. Use the widgets menu above to bring them back.
        </p>
      ) : null}

      <TaskDialog draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
