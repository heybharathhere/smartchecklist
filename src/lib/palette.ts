import {
  Book,
  Briefcase,
  Calendar,
  CheckSquare,
  Code2,
  Dumbbell,
  Heart,
  Home,
  Plane,
  ShoppingCart,
  Sparkles,
  Target,
} from 'lucide-react';
import type { ColorKey, IconKey, Priority, TaskStatus } from '@/types';

export interface ColorSpec {
  key: ColorKey;
  label: string;
  /** Used for dots, rails and progress bars. */
  hex: string;
  /** Tailwind-ready tint classes for chips and headers. */
  tint: string;
  text: string;
}

export const COLORS: ColorSpec[] = [
  { key: 'copper', label: 'Copper', hex: '#E8A33D', tint: 'bg-[#E8A33D]/14', text: 'text-[#B06916] dark:text-[#E8A33D]' },
  { key: 'teal', label: 'Teal', hex: '#4FD1C5', tint: 'bg-[#4FD1C5]/14', text: 'text-[#0D8A7E] dark:text-[#4FD1C5]' },
  { key: 'azure', label: 'Azure', hex: '#6BA8F5', tint: 'bg-[#6BA8F5]/14', text: 'text-[#2563C3] dark:text-[#6BA8F5]' },
  { key: 'violet', label: 'Violet', hex: '#A78BFA', tint: 'bg-[#A78BFA]/14', text: 'text-[#6D4AD8] dark:text-[#A78BFA]' },
  { key: 'rose', label: 'Rose', hex: '#F2635F', tint: 'bg-[#F2635F]/14', text: 'text-[#C53030] dark:text-[#F2635F]' },
  { key: 'moss', label: 'Moss', hex: '#7FB069', tint: 'bg-[#7FB069]/14', text: 'text-[#4A7A38] dark:text-[#7FB069]' },
  { key: 'slate', label: 'Slate', hex: '#94A3BA', tint: 'bg-[#94A3BA]/14', text: 'text-[#627189] dark:text-[#94A3BA]' },
  { key: 'amber', label: 'Amber', hex: '#D97B3F', tint: 'bg-[#D97B3F]/14', text: 'text-[#A85A24] dark:text-[#D97B3F]' },
];

const colorIndex = new Map(COLORS.map((c) => [c.key, c]));

export function color(key: ColorKey | undefined): ColorSpec {
  return colorIndex.get(key ?? 'copper') ?? COLORS[0];
}

export const ICONS: { key: IconKey; label: string; Icon: typeof CheckSquare }[] = [
  { key: 'checklist', label: 'Checklist', Icon: CheckSquare },
  { key: 'briefcase', label: 'Work', Icon: Briefcase },
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'heart', label: 'Health', Icon: Heart },
  { key: 'book', label: 'Study', Icon: Book },
  { key: 'cart', label: 'Shopping', Icon: ShoppingCart },
  { key: 'plane', label: 'Travel', Icon: Plane },
  { key: 'code', label: 'Build', Icon: Code2 },
  { key: 'dumbbell', label: 'Training', Icon: Dumbbell },
  { key: 'sparkles', label: 'Routine', Icon: Sparkles },
  { key: 'target', label: 'Goal', Icon: Target },
  { key: 'calendar', label: 'Planner', Icon: Calendar },
];

const iconIndex = new Map(ICONS.map((i) => [i.key, i.Icon]));

export function icon(key: IconKey | undefined) {
  return iconIndex.get(key ?? 'checklist') ?? CheckSquare;
}

export const PRIORITIES: { key: Priority; label: string; className: string; dot: string; weight: number }[] = [
  { key: 'critical', label: 'Critical', className: 'text-critical border-critical/40 bg-critical/10', dot: 'bg-critical', weight: 0 },
  { key: 'high', label: 'High', className: 'text-high border-high/40 bg-high/10', dot: 'bg-high', weight: 1 },
  { key: 'medium', label: 'Medium', className: 'text-medium border-medium/40 bg-medium/10', dot: 'bg-medium', weight: 2 },
  { key: 'low', label: 'Low', className: 'text-low border-low/40 bg-low/10', dot: 'bg-low', weight: 3 },
];

const priorityIndex = new Map(PRIORITIES.map((p) => [p.key, p]));

export function priority(key: Priority | undefined) {
  return priorityIndex.get(key ?? 'medium') ?? PRIORITIES[2];
}

export const STATUSES: { key: TaskStatus; label: string; className: string }[] = [
  { key: 'todo', label: 'To do', className: 'text-steel border-hairline bg-steel/10' },
  { key: 'in_progress', label: 'In progress', className: 'text-medium border-medium/40 bg-medium/10' },
  { key: 'blocked', label: 'Blocked', className: 'text-critical border-critical/40 bg-critical/10' },
  { key: 'done', label: 'Done', className: 'text-teal border-teal/40 bg-teal/10' },
];

export function statusLabel(key: TaskStatus): string {
  return STATUSES.find((s) => s.key === key)?.label ?? 'To do';
}
