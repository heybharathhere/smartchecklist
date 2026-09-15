export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type ViewMode = 'list' | 'kanban' | 'calendar' | 'timeline' | 'compact';
export type ThemeMode = 'light' | 'dark' | 'system';
export type DateFormat = 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd' | 'd MMM yyyy';
export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly';

export interface Recurrence {
  freq: RecurrenceFreq;
  /** Every n days / weeks / months. */
  interval: number;
  /** For weekly: 0 (Sun) – 6 (Sat). Empty means "same weekday as the due date". */
  weekdays?: number[];
}

export interface Checklist {
  id: string;
  title: string;
  description: string;
  color: ColorKey;
  icon: IconKey;
  category: string;
  tags: string[];
  favorite: boolean;
  pinned: boolean;
  archived: boolean;
  defaultView: ViewMode | null;
  order: number;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
}

export interface Task {
  id: string;
  checklistId: string;
  parentId: string | null;
  title: string;
  notes: string;
  priority: Priority;
  status: TaskStatus;
  completed: boolean;
  completedAt: number | null;
  startDate: string | null; // yyyy-MM-dd
  dueDate: string | null; // yyyy-MM-dd
  reminderAt: number | null;
  reminderFired: boolean;
  tags: string[];
  recurrence: Recurrence | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityEntry {
  id: string;
  ts: number;
  kind: 'created' | 'completed' | 'reopened' | 'deleted' | 'updated' | 'archived' | 'restored' | 'imported';
  entity: 'checklist' | 'task' | 'data';
  entityId: string;
  message: string;
}

export interface TemplateTask {
  title: string;
  notes?: string;
  priority?: Priority;
  /** Days after instantiation that this task is due. */
  dueInDays?: number | null;
  children?: TemplateTask[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  color: ColorKey;
  icon: IconKey;
  tasks: TemplateTask[];
  builtIn: boolean;
  createdAt: number;
}

export type DueFilter = 'any' | 'overdue' | 'today' | 'tomorrow' | 'week' | 'month' | 'none';
export type StatusFilter = 'all' | 'open' | 'done' | TaskStatus;
export type SortKey = 'manual' | 'smart' | 'due' | 'priority' | 'created' | 'alpha';

export interface FilterState {
  query: string;
  status: StatusFilter;
  priorities: Priority[];
  categories: string[];
  tags: string[];
  due: DueFilter;
  sort: SortKey;
}

export interface SavedFilter {
  id: string;
  name: string;
  filter: FilterState;
  createdAt: number;
}

export interface BackupRecord {
  id: string;
  createdAt: number;
  automatic: boolean;
  size: number;
  payload: BackupPayload;
}

export interface BackupPayload {
  app: 'smart-checklist';
  version: number;
  exportedAt: number;
  checklists: Checklist[];
  tasks: Task[];
  templates: Template[];
  savedFilters: SavedFilter[];
  activity: ActivityEntry[];
}

export interface Preferences {
  theme: ThemeMode;
  highContrast: boolean;
  reduceMotion: boolean;
  dateFormat: DateFormat;
  weekStartsOn: 0 | 1;
  defaultView: ViewMode;
  sidebarCollapsed: boolean;
  autoBackup: boolean;
  autoBackupKeep: number;
  notifications: boolean;
  confirmDelete: boolean;
  pomodoroFocus: number;
  pomodoroBreak: number;
  pomodoroLongBreak: number;
  widgets: Record<DashboardWidget, boolean>;
}

export type DashboardWidget = 'today' | 'heatmap' | 'upcoming' | 'breakdown' | 'activity' | 'streak';

export type ColorKey =
  | 'copper'
  | 'teal'
  | 'azure'
  | 'violet'
  | 'rose'
  | 'moss'
  | 'slate'
  | 'amber';

export type IconKey =
  | 'checklist'
  | 'briefcase'
  | 'home'
  | 'heart'
  | 'book'
  | 'cart'
  | 'plane'
  | 'code'
  | 'dumbbell'
  | 'sparkles'
  | 'target'
  | 'calendar';

export interface ChecklistProgress {
  total: number;
  done: number;
  open: number;
  overdue: number;
  percent: number;
}

export interface Toast {
  id: string;
  message: string;
  tone: 'default' | 'success' | 'danger';
  undo?: () => void;
}
