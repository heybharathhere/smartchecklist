import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { COLORS } from '@/lib/palette';
import {
  achievements,
  categoryBreakdown,
  completionsByDay,
  completionsByMonth,
  completionsByWeek,
  completionStreak,
  overview as buildOverview,
} from '@/lib/stats';
import { Badge, Card, EmptyState, ProgressBar, ProgressRing, SectionHeading, Segmented } from '@/components/ui/primitives';
import { CompletionHeatmap } from '@/components/dashboard/widgets';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';

type Range = '14' | '30' | '90';

const axisStyle = { fontSize: 11, fill: 'rgb(var(--c-muted))' };

function chartTooltip() {
  return {
    contentStyle: {
      background: 'rgb(var(--c-surface))',
      border: '1px solid rgb(var(--c-hairline))',
      borderRadius: 11,
      fontSize: 12,
      color: 'rgb(var(--c-text))',
    },
    labelStyle: { color: 'rgb(var(--c-muted))' },
  };
}

export default function Analytics() {
  const checklists = useData((state) => state.checklists);
  const tasks = useData((state) => state.tasks);
  const weekStartsOn = usePrefs((state) => state.weekStartsOn);
  const [range, setRange] = useState<Range>('30');

  const liveTasks = useMemo(() => {
    const archived = new Set(checklists.filter((list) => list.archived).map((list) => list.id));
    return tasks.filter((task) => !archived.has(task.checklistId));
  }, [tasks, checklists]);

  const stats = useMemo(() => buildOverview(checklists, tasks, weekStartsOn), [checklists, tasks, weekStartsOn]);
  const daily = useMemo(() => completionsByDay(liveTasks, Number(range)), [liveTasks, range]);
  const weekly = useMemo(() => completionsByWeek(liveTasks, 12, weekStartsOn), [liveTasks, weekStartsOn]);
  const monthly = useMemo(() => completionsByMonth(liveTasks, 6), [liveTasks]);
  const slices = useMemo(() => categoryBreakdown(checklists, tasks), [checklists, tasks]);
  const badges = useMemo(() => achievements(liveTasks, checklists), [liveTasks, checklists]);
  const streak = useMemo(() => completionStreak(liveTasks), [liveTasks]);

  if (!liveTasks.length) {
    return (
      <EmptyState
        title="No data to chart yet"
        body="Complete a few tasks and the daily, weekly and monthly trends will fill in here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-limestone">Analytics</h1>
          <p className="mt-0.5 text-sm text-steel">
            {stats.done} of {stats.tasks} tasks finished · {streak.current}-day streak
          </p>
        </div>
        <Segmented
          ariaLabel="Chart range"
          value={range}
          onChange={setRange}
          options={[
            { value: '14', label: '14 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="p-4">
          <SectionHeading title="Daily completions" hint="Tasks finished versus tasks added" />
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="fill-done" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--c-progress))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="rgb(var(--c-progress))" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgb(var(--c-hairline))" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} interval="preserveStartEnd" stroke="rgb(var(--c-hairline))" />
                <YAxis tick={axisStyle} allowDecimals={false} stroke="rgb(var(--c-hairline))" />
                <Tooltip {...chartTooltip()} />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="rgb(var(--c-progress))"
                  strokeWidth={2}
                  fill="url(#fill-done)"
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="Added"
                  stroke="rgb(var(--c-accent))"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="none"
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgb(var(--c-muted))' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center gap-3 p-4">
          <SectionHeading title="Completion rate" />
          <ProgressRing percent={stats.percent} size={148}>
            <span className="tabular font-display text-3xl font-semibold text-limestone">
              {stats.percent}%
            </span>
            <span className="text-2xs text-steel">of all tasks</span>
          </ProgressRing>
          <dl className="grid w-full grid-cols-2 gap-2 text-center text-2xs text-steel">
            <div>
              <dt>Done this week</dt>
              <dd className="tabular mt-0.5 text-base text-limestone">{stats.completedWeek}</dd>
            </div>
            <div>
              <dt>Productivity score</dt>
              <dd className="tabular mt-0.5 text-base text-copper">{stats.score}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionHeading title="Weekly throughput" hint="Last 12 weeks" />
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgb(var(--c-hairline))" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} stroke="rgb(var(--c-hairline))" />
                <YAxis tick={axisStyle} allowDecimals={false} stroke="rgb(var(--c-hairline))" />
                <Tooltip {...chartTooltip()} />
                <Bar dataKey="completed" name="Completed" fill="rgb(var(--c-progress))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeading title="Monthly trend" hint="Last 6 months" />
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgb(var(--c-hairline))" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} stroke="rgb(var(--c-hairline))" />
                <YAxis tick={axisStyle} allowDecimals={false} stroke="rgb(var(--c-hairline))" />
                <Tooltip {...chartTooltip()} />
                <Bar dataKey="created" name="Added" fill="rgb(var(--c-accent))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="rgb(var(--c-progress))" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgb(var(--c-muted))' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionHeading title="Category split" hint="Tasks by checklist category" />
          {slices.length ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <div className="h-48 w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={slices}
                      dataKey="total"
                      nameKey="name"
                      innerRadius="52%"
                      outerRadius="82%"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {slices.map((slice, index) => (
                        <Cell key={slice.name} fill={COLORS[index % COLORS.length].hex} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltip()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-2 sm:w-1/2">
                {slices.slice(0, 6).map((slice, index) => (
                  <li key={slice.name}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length].hex }}
                        />
                        <span className="truncate text-limestone">{slice.name}</span>
                      </span>
                      <span className="tabular shrink-0 text-2xs text-steel">{slice.percent}%</span>
                    </div>
                    <ProgressBar percent={slice.percent} label={`${slice.name} progress`} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-steel">
              Add categories to your checklists to see this split.
            </p>
          )}
        </Card>

        <Card className="p-4">
          <SectionHeading title="Badges" hint={`${badges.filter((b) => b.earned).length} of ${badges.length} earned`} />
          <ul className="space-y-2.5">
            {badges.map((badge) => (
              <li key={badge.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm text-limestone">
                    {badge.name}
                    {badge.earned ? (
                      <Badge className="border-copper/35 bg-copper/10 text-copper">earned</Badge>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-2xs text-steel">{badge.detail}</span>
                </div>
                <ProgressBar
                  percent={badge.progress * 100}
                  tone={badge.earned ? 'bg-copper' : 'bg-steel/50'}
                  label={`${badge.name} progress`}
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <CompletionHeatmap tasks={liveTasks} />
    </div>
  );
}
