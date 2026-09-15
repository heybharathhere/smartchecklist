import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Flame,
  ListChecks,
  ListTodo,
  Trophy,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { format, fromISO, relativeDay, timeAgo } from '@/lib/date';
import { priority as prioritySpec } from '@/lib/palette';
import { achievements, categoryBreakdown, completionStreak, heatmap, type Overview } from '@/lib/stats';
import { Badge, Card, ProgressBar, SectionHeading } from '@/components/ui/primitives';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import type { ActivityEntry, Checklist, Task } from '@/types';

export function StatCards({ overview }: { overview: Overview }) {
  const cards: { label: string; value: string; hint: string; icon: ReactNode; to: string; tone?: string }[] = [
    {
      label: 'Checklists',
      value: String(overview.checklists),
      hint: overview.archived ? `${overview.archived} archived` : 'all active',
      icon: <ListChecks size={16} />,
      to: '/checklists',
    },
    {
      label: 'Open tasks',
      value: String(overview.open),
      hint: `${overview.dueToday} due today`,
      icon: <ListTodo size={16} />,
      to: '/tasks',
    },
    {
      label: 'Completed',
      value: String(overview.done),
      hint: `${overview.completedWeek} this week`,
      icon: <CheckCircle2 size={16} />,
      to: '/analytics',
    },
    {
      label: 'Overdue',
      value: String(overview.overdue),
      hint: overview.overdue ? 'needs attention' : 'nothing late',
      icon: <AlertTriangle size={16} />,
      to: '/tasks',
      tone: overview.overdue ? 'text-critical' : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.label}
          to={card.to}
          className="panel flex flex-col gap-1 p-4 transition-colors hover:border-steel/40"
        >
          <span className="flex items-center gap-2 text-sm text-steel">
            <span className={cn(card.tone ?? 'text-steel')}>{card.icon}</span>
            {card.label}
          </span>
          <span className={cn('tabular font-display text-2xl font-semibold', card.tone ?? 'text-limestone')}>
            {card.value}
          </span>
          <span className="text-2xs text-steel">{card.hint}</span>
        </Link>
      ))}
    </div>
  );
}

const LEVEL_CLASS = [
  'bg-steel/12',
  'bg-teal/25',
  'bg-teal/45',
  'bg-teal/70',
  'bg-teal',
];

export function CompletionHeatmap({ tasks, days = 119 }: { tasks: Task[]; days?: number }) {
  const cells = heatmap(tasks, days);
  const weeks: typeof cells[] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  const total = cells.reduce((sum, cell) => sum + cell.count, 0);

  return (
    <Card className="p-4">
      <SectionHeading
        title="Completion heatmap"
        hint={`${total} tasks finished in the last ${Math.round(days / 7)} weeks`}
      />
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, index) => (
          <div key={index} className="flex flex-col gap-1">
            {week.map((cell) => {
              const date = fromISO(cell.date);
              return (
                <span
                  key={cell.date}
                  title={`${cell.count} finished on ${date ? format(date, 'd MMM yyyy') : cell.date}`}
                  className={cn('h-3.5 w-3.5 rounded-[4px]', LEVEL_CLASS[cell.level])}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-2xs text-steel">
        <span>Quiet</span>
        {LEVEL_CLASS.map((className) => (
          <span key={className} className={cn('h-3 w-3 rounded-[4px]', className)} />
        ))}
        <span>Busy</span>
      </div>
    </Card>
  );
}

export function UpcomingWidget({
  tasks,
  checklists,
  onEdit,
}: {
  tasks: Task[];
  checklists: Checklist[];
  onEdit: (id: string) => void;
}) {
  const dateFormat = usePrefs((state) => state.dateFormat);
  const toggleTask = useData((state) => state.toggleTask);
  const names = new Map(checklists.map((list) => [list.id, list.title]));

  const upcoming = tasks
    .filter((task) => !task.completed && task.dueDate)
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))
    .slice(0, 7);

  return (
    <Card className="p-4">
      <SectionHeading
        title="Coming up"
        hint="The next dated tasks across every checklist"
        action={
          <Link to="/tasks" className="text-sm text-copper hover:underline">
            See all
          </Link>
        }
      />
      {upcoming.length === 0 ? (
        <p className="py-6 text-center text-sm text-steel">
          Nothing is dated yet. Add a due date and it will surface here.
        </p>
      ) : (
        <ul className="divide-y">
          {upcoming.map((task) => (
            <li key={task.id} className="flex items-center gap-3 py-2.5">
              <button
                onClick={() => void toggleTask(task.id, true)}
                aria-label={`Mark ${task.title} done`}
                className="h-4.5 w-4.5 shrink-0 rounded-[6px] border border-steel/50 transition-colors hover:border-teal hover:bg-teal/20"
                style={{ height: 18, width: 18 }}
              />
              <button onClick={() => onEdit(task.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm text-limestone">{task.title}</span>
                <span className="block truncate text-2xs text-steel">
                  {names.get(task.checklistId)}
                </span>
              </button>
              <Badge className="border-hairline shrink-0 text-steel" dot={prioritySpec(task.priority).dot}>
                {relativeDay(task.dueDate, dateFormat)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function CategoryBreakdown({
  checklists,
  tasks,
}: {
  checklists: Checklist[];
  tasks: Task[];
}) {
  const slices = categoryBreakdown(checklists, tasks).slice(0, 6);

  return (
    <Card className="p-4">
      <SectionHeading title="By category" hint="Share of tasks finished in each group" />
      {slices.length === 0 ? (
        <p className="py-6 text-center text-sm text-steel">
          Give checklists a category to see this split.
        </p>
      ) : (
        <ul className="space-y-3">
          {slices.map((slice) => (
            <li key={slice.name}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-limestone">{slice.name}</span>
                <span className="tabular shrink-0 text-2xs text-steel">
                  {slice.done}/{slice.total}
                </span>
              </div>
              <ProgressBar percent={slice.percent} label={`${slice.name} progress`} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const ACTIVITY_TONE: Record<ActivityEntry['kind'], string> = {
  created: 'text-medium',
  completed: 'text-teal',
  reopened: 'text-steel',
  deleted: 'text-critical',
  updated: 'text-steel',
  archived: 'text-steel',
  restored: 'text-steel',
  imported: 'text-copper',
};

export function RecentActivity({ activity }: { activity: ActivityEntry[] }) {
  const entries = activity.slice(-9).reverse();

  return (
    <Card className="p-4">
      <SectionHeading title="Recent activity" hint="The last few changes on this device" />
      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-steel">
          Nothing has happened yet. Create a checklist to get going.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-baseline gap-2.5 text-sm">
              <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current', ACTIVITY_TONE[entry.kind])} />
              <span className="min-w-0 flex-1 text-limestone">{entry.message}</span>
              <time className="shrink-0 text-2xs text-steel">{timeAgo(entry.ts)}</time>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function StreakCard({ tasks }: { tasks: Task[] }) {
  const { current, best } = completionStreak(tasks);
  const earned = achievements(tasks, useData.getState().checklists).filter((item) => item.earned);

  return (
    <Card className="p-4">
      <SectionHeading title="Streak" hint="Days in a row with at least one task finished" />
      <div className="flex items-center gap-5">
        <div className="flex items-baseline gap-1.5">
          <Flame size={22} className={current ? 'text-copper' : 'text-steel'} />
          <span className="tabular font-display text-3xl font-semibold text-limestone">{current}</span>
          <span className="text-sm text-steel">{current === 1 ? 'day' : 'days'}</span>
        </div>
        <div className="text-2xs text-steel">
          <p className="tabular">Best run: {best} days</p>
          <p className="mt-0.5 inline-flex items-center gap-1">
            <Trophy size={11} />
            {earned.length} of 8 badges
          </p>
        </div>
      </div>
      {earned.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {earned.slice(0, 5).map((badge) => (
            <Badge key={badge.id} className="border-copper/35 bg-copper/10 text-copper">
              {badge.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function TodayCard({
  overview,
  onFocus,
}: {
  overview: Overview;
  onFocus: () => void;
}) {
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-steel">{format(new Date(), 'EEEE d MMMM')}</p>
        <h2 className="mt-1 font-display text-xl text-limestone">
          {overview.dueToday
            ? `${overview.dueToday} ${overview.dueToday === 1 ? 'task' : 'tasks'} due today`
            : overview.open
              ? 'Nothing due today'
              : 'Everything is clear'}
        </h2>
        <p className="mt-1 text-sm text-steel">
          {overview.completedToday} finished today · {overview.open} still open
          {overview.overdue ? ` · ${overview.overdue} overdue` : ''}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-2xs text-steel">Productivity score</p>
          <p className="tabular font-display text-2xl font-semibold text-copper">{overview.score}</p>
        </div>
        <button
          onClick={onFocus}
          className="inline-flex items-center gap-2 rounded-control bg-copper px-4 py-2.5 text-sm font-medium text-ink shadow-raise hover:brightness-110"
        >
          <CalendarDays size={16} />
          Start focus
        </button>
      </div>
    </Card>
  );
}
