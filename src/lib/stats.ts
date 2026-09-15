import {
  differenceInCalendarDays,
  format,
  isOverdue,
  lastNDays,
  startOfDay,
  startOfWeek,
  subDays,
  toISO,
} from '@/lib/date';
import { progressOfTasks } from '@/lib/tasks';
import type { Checklist, Task } from '@/types';

export interface DayPoint {
  date: string; // yyyy-MM-dd
  label: string;
  completed: number;
  created: number;
}

export function completionsByDay(tasks: Task[], days: number): DayPoint[] {
  const completed = new Map<string, number>();
  const created = new Map<string, number>();
  for (const task of tasks) {
    if (task.completedAt) {
      const key = toISO(new Date(task.completedAt));
      completed.set(key, (completed.get(key) ?? 0) + 1);
    }
    const createdKey = toISO(new Date(task.createdAt));
    created.set(createdKey, (created.get(createdKey) ?? 0) + 1);
  }
  return lastNDays(days).map((date) => {
    const key = toISO(date);
    return {
      date: key,
      label: format(date, days > 45 ? 'd MMM' : 'EEE d'),
      completed: completed.get(key) ?? 0,
      created: created.get(key) ?? 0,
    };
  });
}

export interface WeekPoint {
  label: string;
  completed: number;
  created: number;
}

export function completionsByWeek(tasks: Task[], weeks: number, weekStartsOn: 0 | 1): WeekPoint[] {
  const buckets = new Map<string, WeekPoint>();
  const order: string[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = startOfWeek(subDays(new Date(), i * 7), { weekStartsOn });
    const key = toISO(start);
    order.push(key);
    buckets.set(key, { label: format(start, 'd MMM'), completed: 0, created: 0 });
  }
  const keyFor = (ts: number) => toISO(startOfWeek(new Date(ts), { weekStartsOn }));
  for (const task of tasks) {
    if (task.completedAt) {
      const bucket = buckets.get(keyFor(task.completedAt));
      if (bucket) bucket.completed += 1;
    }
    const createdBucket = buckets.get(keyFor(task.createdAt));
    if (createdBucket) createdBucket.created += 1;
  }
  return order.map((key) => buckets.get(key) as WeekPoint);
}

export function completionsByMonth(tasks: Task[], months: number): WeekPoint[] {
  const buckets = new Map<string, WeekPoint>();
  const order: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = format(date, 'yyyy-MM');
    order.push(key);
    buckets.set(key, { label: format(date, 'MMM yy'), completed: 0, created: 0 });
  }
  for (const task of tasks) {
    if (task.completedAt) {
      const bucket = buckets.get(format(new Date(task.completedAt), 'yyyy-MM'));
      if (bucket) bucket.completed += 1;
    }
    const createdBucket = buckets.get(format(new Date(task.createdAt), 'yyyy-MM'));
    if (createdBucket) createdBucket.created += 1;
  }
  return order.map((key) => buckets.get(key) as WeekPoint);
}

export interface CategorySlice {
  name: string;
  total: number;
  done: number;
  percent: number;
}

export function categoryBreakdown(checklists: Checklist[], tasks: Task[]): CategorySlice[] {
  const byList = new Map(checklists.map((list) => [list.id, list]));
  const buckets = new Map<string, { total: number; done: number }>();
  for (const task of tasks) {
    const list = byList.get(task.checklistId);
    if (!list || list.archived) continue;
    const name = list.category || 'Uncategorised';
    const bucket = buckets.get(name) ?? { total: 0, done: 0 };
    bucket.total += 1;
    if (task.completed) bucket.done += 1;
    buckets.set(name, bucket);
  }
  return Array.from(buckets.entries())
    .map(([name, { total, done }]) => ({
      name,
      total,
      done,
      percent: total ? Math.round((done / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Consecutive days (ending today or yesterday) with at least one completion. */
export function completionStreak(tasks: Task[]): { current: number; best: number } {
  const days = new Set(
    tasks.filter((t) => t.completedAt).map((t) => toISO(new Date(t.completedAt as number))),
  );
  if (!days.size) return { current: 0, best: 0 };

  const sorted = Array.from(days)
    .map((d) => startOfDay(new Date(`${d}T00:00:00`)).getTime())
    .sort((a, b) => a - b);

  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = differenceInCalendarDays(new Date(sorted[i]), new Date(sorted[i - 1]));
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }

  let current = 0;
  const today = startOfDay(new Date());
  const startOffset = days.has(toISO(today)) ? 0 : days.has(toISO(subDays(today, 1))) ? 1 : -1;
  if (startOffset >= 0) {
    current = 0;
    for (let i = startOffset; i < 3650; i += 1) {
      if (days.has(toISO(subDays(today, i)))) current += 1;
      else break;
    }
  }
  return { current, best };
}

export interface Overview {
  checklists: number;
  archived: number;
  tasks: number;
  open: number;
  done: number;
  overdue: number;
  dueToday: number;
  percent: number;
  completedToday: number;
  completedWeek: number;
  score: number;
}

export function overview(checklists: Checklist[], tasks: Task[], weekStartsOn: 0 | 1): Overview {
  const live = checklists.filter((c) => !c.archived);
  const liveIds = new Set(live.map((c) => c.id));
  const liveTasks = tasks.filter((t) => liveIds.has(t.checklistId));
  const base = progressOfTasks(liveTasks);

  const today = toISO(new Date());
  const weekStart = startOfWeek(new Date(), { weekStartsOn }).getTime();

  let dueToday = 0;
  let completedToday = 0;
  let completedWeek = 0;
  for (const task of liveTasks) {
    if (!task.completed && task.dueDate === today) dueToday += 1;
    if (task.completedAt) {
      if (toISO(new Date(task.completedAt)) === today) completedToday += 1;
      if (task.completedAt >= weekStart) completedWeek += 1;
    }
  }

  return {
    checklists: live.length,
    archived: checklists.length - live.length,
    tasks: liveTasks.length,
    open: base.open,
    done: base.done,
    overdue: base.overdue,
    dueToday,
    percent: base.percent,
    completedToday,
    completedWeek,
    score: productivityScore(liveTasks, completedWeek, base.overdue),
  };
}

/**
 * 0–100 blend of throughput, follow-through and how much is running late.
 * Deliberately forgiving: an empty app scores 0, not a failure.
 */
export function productivityScore(tasks: Task[], completedWeek: number, overdue: number): number {
  if (!tasks.length) return 0;
  const throughput = Math.min(1, completedWeek / 20) * 45;
  const follow = (tasks.filter((t) => t.completed).length / tasks.length) * 35;
  const openCount = Math.max(1, tasks.filter((t) => !t.completed).length);
  const punctuality = (1 - Math.min(1, overdue / openCount)) * 20;
  return Math.round(throughput + follow + punctuality);
}

export interface Achievement {
  id: string;
  name: string;
  detail: string;
  earned: boolean;
  progress: number; // 0–1
}

export function achievements(tasks: Task[], checklists: Checklist[]): Achievement[] {
  const done = tasks.filter((t) => t.completed).length;
  const { current, best } = completionStreak(tasks);
  const zeroOverdue = tasks.filter((t) => isOverdue(t.dueDate, t.completed)).length === 0;
  const finished = checklists.filter((list) => {
    const own = tasks.filter((t) => t.checklistId === list.id);
    return own.length > 0 && own.every((t) => t.completed);
  }).length;

  const make = (id: string, name: string, detail: string, value: number, target: number): Achievement => ({
    id,
    name,
    detail,
    earned: value >= target,
    progress: Math.min(1, target ? value / target : 0),
  });

  return [
    make('first-step', 'First step', 'Complete your first task', done, 1),
    make('ten-down', 'Ten down', 'Complete 10 tasks', done, 10),
    make('century', 'Century', 'Complete 100 tasks', done, 100),
    make('week-streak', 'Seven in a row', 'Finish something 7 days running', best, 7),
    make('month-streak', 'Thirty in a row', 'Finish something 30 days running', best, 30),
    make('clean-slate', 'Nothing late', 'Have no overdue tasks', zeroOverdue ? 1 : 0, 1),
    make('closer', 'Closer', 'Finish every task in a checklist', finished, 1),
    make('streak-live', 'On a run', 'Keep a 3-day streak alive', current, 3),
  ];
}

/** Heatmap cells for the last `days` days, with an intensity bucket 0–4. */
export function heatmap(tasks: Task[], days: number): { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] {
  const points = completionsByDay(tasks, days);
  const max = Math.max(1, ...points.map((p) => p.completed));
  return points.map((point) => {
    const ratio = point.completed / max;
    const level: 0 | 1 | 2 | 3 | 4 =
      point.completed === 0 ? 0 : ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
    return { date: point.date, count: point.completed, level };
  });
}
