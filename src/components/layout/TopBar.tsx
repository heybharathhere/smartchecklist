import {
  Command,
  Keyboard,
  Maximize2,
  Monitor,
  Moon,
  Plus,
  Search,
  Sun,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/primitives';
import { Menu } from '@/components/ui/Menu';
import { usePrefs } from '@/store/usePrefs';
import { useUI } from '@/store/useUI';
import type { ThemeMode } from '@/types';

const THEME_ICON: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function TopBar() {
  const theme = usePrefs((state) => state.theme);
  const setPref = usePrefs((state) => state.set);
  const filter = useUI((state) => state.filter);
  const setFilter = useUI((state) => state.setFilter);
  const setCommandOpen = useUI((state) => state.setCommandOpen);
  const setQuickAddOpen = useUI((state) => state.setQuickAddOpen);
  const setShortcutsOpen = useUI((state) => state.setShortcutsOpen);
  const toggleFocusMode = useUI((state) => state.toggleFocusMode);
  const navigate = useNavigate();
  const location = useLocation();
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const ThemeIcon = THEME_ICON[theme];

  return (
    <header className="no-print sticky top-0 z-30 border-b glass">
      <div className="flex items-center gap-2 px-4 py-3 sm:px-6">
        <div className="relative min-w-0 flex-1 max-w-xl">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel"
          />
          <input
            id="global-search"
            value={filter.query}
            onChange={(event) => {
              setFilter({ query: event.target.value });
              if (event.target.value && !location.pathname.startsWith('/tasks')) navigate('/tasks');
            }}
            placeholder="Search tasks and checklists"
            aria-label="Search tasks and checklists"
            className="h-10 w-full rounded-control border bg-ink/40 pl-9 pr-9 text-sm text-limestone placeholder:text-steel/70 focus:border-copper/60"
          />
          {filter.query ? (
            <button
              onClick={() => setFilter({ query: '' })}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-steel hover:text-limestone"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        {offline ? (
          <span className="hidden items-center gap-1.5 rounded-full border border-copper/40 bg-copper/10 px-2.5 py-1 text-2xs text-copper sm:inline-flex">
            <WifiOff size={12} />
            Offline
          </span>
        ) : null}

        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => setCommandOpen(true)}
        >
          <Command size={14} />
          <span className="tabular">Ctrl K</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={toggleFocusMode}
          aria-label="Toggle focus mode"
        >
          <Maximize2 size={16} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={() => setShortcutsOpen(true)}
          aria-label="Keyboard shortcuts"
        >
          <Keyboard size={16} />
        </Button>

        <Menu
          label="Theme"
          items={[
            { label: 'Light', icon: <Sun size={15} />, onSelect: () => setPref('theme', 'light') },
            { label: 'Dark', icon: <Moon size={15} />, onSelect: () => setPref('theme', 'dark') },
            {
              label: 'Match system',
              icon: <Monitor size={15} />,
              onSelect: () => setPref('theme', 'system'),
            },
          ]}
          trigger={({ toggle }) => (
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Change theme">
              <ThemeIcon size={16} />
            </Button>
          )}
        />

        <Button
          variant="primary"
          size="sm"
          onClick={() => setQuickAddOpen(true)}
          className={cn('shrink-0')}
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Add task</span>
        </Button>
      </div>
    </header>
  );
}
