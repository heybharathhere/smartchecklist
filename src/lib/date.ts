import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import type { DateFormat, Recurrence } from '@/types';

export const ISO = 'yyyy-MM-dd';

export function todayISO(): string {
  return format(new Date(), ISO);
}

export function toISO(date: Date): string {
  return format(date, ISO);
}

/** Parses a yyyy-MM-dd string as a *local* date, avoiding UTC drift. */
export function fromISO(value: string): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

export function formatDate(value: string | null, pattern: DateFormat): string {
  const date = value ? fromISO(value) : null;
  return date ? format(date, pattern) : '';
}

export function formatDateTime(ts: number | null, pattern: DateFormat): string {
  if (!ts) return '';
  return format(new Date(ts), `${pattern} HH:mm`);
}

/** "Today", "Tomorrow", "3 days overdue", "in 5 days", or a formatted date. */
export function relativeDay(value: string | null, pattern: DateFormat): string {
  const date = value ? fromISO(value) : null;
  if (!date) return '';
  const diff = differenceInCalendarDays(startOfDay(date), startOfDay(new Date()));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0 && diff >= -13) return `${Math.abs(diff)} days overdue`;
  if (diff > 0 && diff <= 6) return format(date, 'EEEE');
  return format(date, pattern);
}

export function timeAgo(ts: number): string {
  const seconds = Math.round((Date.now() - ts) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return format(new Date(ts), 'd MMM yyyy');
}

export function isOverdue(dueDate: string | null, completed: boolean): boolean {
  if (!dueDate || completed) return false;
  const date = fromISO(dueDate);
  if (!date) return false;
  return differenceInCalendarDays(startOfDay(date), startOfDay(new Date())) < 0;
}

export function daysUntil(dueDate: string | null): number | null {
  const date = dueDate ? fromISO(dueDate) : null;
  if (!date) return null;
  return differenceInCalendarDays(startOfDay(date), startOfDay(new Date()));
}

export function monthGrid(month: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn });
  return eachDayOfInterval({ start, end });
}

export function lastNDays(n: number): Date[] {
  const end = startOfDay(new Date());
  return eachDayOfInterval({ start: subDays(end, n - 1), end });
}

export function weekdayNames(weekStartsOn: 0 | 1): string[] {
  const base = startOfWeek(new Date(), { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => format(addDays(base, i), 'EEEEE'));
}

/** Next occurrence of a recurring date, or null when it can't advance. */
export function nextOccurrence(iso: string | null, rule: Recurrence): string | null {
  const base = iso ? fromISO(iso) : startOfDay(new Date());
  if (!base) return null;
  const interval = Math.max(1, rule.interval || 1);

  if (rule.freq === 'daily') return toISO(addDays(base, interval));
  if (rule.freq === 'monthly') return toISO(addMonths(base, interval));

  // Weekly: step through the selected weekdays when given, else same weekday.
  const days = (rule.weekdays ?? []).slice().sort((a, b) => a - b);
  if (!days.length) return toISO(addWeeks(base, interval));
  for (let i = 1; i <= 7; i += 1) {
    const candidate = addDays(base, i);
    if (days.includes(candidate.getDay())) return toISO(candidate);
  }
  return toISO(addWeeks(base, interval));
}

export function describeRecurrence(rule: Recurrence | null): string {
  if (!rule) return 'Does not repeat';
  const n = Math.max(1, rule.interval || 1);
  if (rule.freq === 'daily') return n === 1 ? 'Every day' : `Every ${n} days`;
  if (rule.freq === 'monthly') return n === 1 ? 'Every month' : `Every ${n} months`;
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = (rule.weekdays ?? []).map((d) => names[d]).join(', ');
  const every = n === 1 ? 'Every week' : `Every ${n} weeks`;
  return days ? `${every} on ${days}` : every;
}

export {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
};
