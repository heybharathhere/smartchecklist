import {
  Archive,
  BarChart3,
  Download,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  ListTodo,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Timer,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { icon as iconOf } from '@/lib/palette';
import { relativeDay } from '@/lib/date';
import { download, buildPayload, stamp } from '@/lib/transfer';
import { Modal } from '@/components/ui/Modal';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import { useToasts } from '@/store/useToasts';
import { useUI } from '@/store/useUI';

interface Entry {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  group: string;
  run: () => void;
}

export function CommandPalette() {
  const open = useUI((state) => state.commandOpen);
  const setOpen = useUI((state) => state.setCommandOpen);
  const setQuickAddOpen = useUI((state) => state.setQuickAddOpen);
  const toggleFocusMode = useUI((state) => state.toggleFocusMode);
  const checklists = useData((state) => state.checklists);
  const tasks = useData((state) => state.tasks);
  const theme = usePrefs((state) => state.theme);
  const setPref = usePrefs((state) => state.set);
  const dateFormat = usePrefs((state) => state.dateFormat);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const go = (to: string) => () => {
      setOpen(false);
      navigate(to);
    };

    const commands: Entry[] = [
      { id: 'c-add', label: 'Add task', icon: <Plus size={15} />, group: 'Actions', run: () => { setOpen(false); setQuickAddOpen(true); } },
      { id: 'c-new-list', label: 'New checklist', icon: <ListChecks size={15} />, group: 'Actions', run: go('/checklists?new=1') },
      { id: 'c-focus', label: 'Toggle focus mode', icon: <Timer size={15} />, group: 'Actions', run: () => { setOpen(false); toggleFocusMode(); } },
      {
        id: 'c-theme',
        label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        icon: theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />,
        group: 'Actions',
        run: () => {
          setPref('theme', theme === 'dark' ? 'light' : 'dark');
          setOpen(false);
        },
      },
      {
        id: 'c-export',
        label: 'Export all data as JSON',
        icon: <Download size={15} />,
        group: 'Actions',
        run: () => {
          const state = useData.getState();
          download(
            `smart-checklist-${stamp()}.json`,
            JSON.stringify(buildPayload(state), null, 2),
            'application/json',
          );
          useToasts.getState().push('Exported a JSON backup.', { tone: 'success' });
          setOpen(false);
        },
      },
      { id: 'n-dash', label: 'Dashboard', icon: <LayoutDashboard size={15} />, group: 'Go to', run: go('/') },
      { id: 'n-lists', label: 'Checklists', icon: <ListChecks size={15} />, group: 'Go to', run: go('/checklists') },
      { id: 'n-tasks', label: 'All tasks', icon: <ListTodo size={15} />, group: 'Go to', run: go('/tasks') },
      { id: 'n-analytics', label: 'Analytics', icon: <BarChart3 size={15} />, group: 'Go to', run: go('/analytics') },
      { id: 'n-templates', label: 'Templates', icon: <LayoutTemplate size={15} />, group: 'Go to', run: go('/templates') },
      { id: 'n-archive', label: 'Archive', icon: <Archive size={15} />, group: 'Go to', run: go('/archive') },
      { id: 'n-settings', label: 'Settings', icon: <Settings size={15} />, group: 'Go to', run: go('/settings') },
    ];

    const listEntries: Entry[] = checklists
      .filter((list) => !list.archived)
      .map((list) => {
        const Icon = iconOf(list.icon);
        return {
          id: `l-${list.id}`,
          label: list.title,
          hint: list.category || undefined,
          icon: <Icon size={15} />,
          group: 'Checklists',
          run: go(`/checklists/${list.id}`),
        };
      });

    const taskEntries: Entry[] = tasks
      .filter((task) => !task.completed)
      .slice(0, 400)
      .map((task) => ({
        id: `t-${task.id}`,
        label: task.title,
        hint:
          [checklists.find((c) => c.id === task.checklistId)?.title, relativeDay(task.dueDate, dateFormat)]
            .filter(Boolean)
            .join(' · ') || undefined,
        icon: <ListTodo size={15} />,
        group: 'Tasks',
        run: go(`/checklists/${task.checklistId}?task=${task.id}`),
      }));

    return [...commands, ...listEntries, ...taskEntries];
  }, [checklists, tasks, theme, dateFormat, navigate, setOpen, setPref, setQuickAddOpen, toggleFocusMode]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries.slice(0, 18);
    const scored = entries
      .map((entry) => {
        const label = entry.label.toLowerCase();
        const index = label.indexOf(needle);
        const hintHit = entry.hint?.toLowerCase().includes(needle) ? 1 : 0;
        if (index === -1 && !hintHit) return null;
        return { entry, score: index === -1 ? 60 : index === 0 ? 0 : 10 + index };
      })
      .filter((row): row is { entry: Entry; score: number } => row !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 24);
    return scored.map((row) => row.entry);
  }, [entries, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, results]);

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    results.forEach((entry) => {
      const bucket = map.get(entry.group);
      if (bucket) bucket.push(entry);
      else map.set(entry.group, [entry]);
    });
    return Array.from(map.entries());
  }, [results]);

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Command palette" size="lg" bare>
      <div className="flex items-center gap-2.5 border-b px-4 py-3">
        <Search size={17} className="text-steel" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => (index + 1) % Math.max(1, results.length));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => (index - 1 + results.length) % Math.max(1, results.length));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              results[active]?.run();
            }
          }}
          placeholder="Search commands, checklists and tasks"
          aria-label="Search commands, checklists and tasks"
          className="w-full bg-transparent text-[0.95rem] text-limestone placeholder:text-steel/70 focus:outline-none"
        />
      </div>

      <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
        {results.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-steel">
            Nothing matches “{query}”. Try a checklist or task name.
          </li>
        ) : (
          grouped.map(([group, items]) => (
            <li key={group}>
              <p className="px-3 pb-1 pt-2.5 text-2xs font-medium text-steel">{group}</p>
              <ul>
                {items.map((entry) => {
                  const index = results.indexOf(entry);
                  const isActive = index === active;
                  return (
                    <li key={entry.id}>
                      <button
                        data-active={isActive}
                        onMouseEnter={() => setActive(index)}
                        onClick={entry.run}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors',
                          isActive ? 'bg-copper/12 text-copper' : 'text-limestone hover:bg-steel/10',
                        )}
                      >
                        <span className={cn(isActive ? 'text-copper' : 'text-steel')}>{entry.icon}</span>
                        <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                        {entry.hint ? (
                          <span className="hidden shrink-0 text-2xs text-steel sm:block">{entry.hint}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))
        )}
      </ul>

      <footer className="flex items-center gap-4 border-t px-4 py-2.5 text-2xs text-steel">
        <span>↑↓ to move</span>
        <span>Enter to run</span>
        <span>Esc to close</span>
      </footer>
    </Modal>
  );
}
