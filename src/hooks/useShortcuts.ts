import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrefs } from '@/store/usePrefs';
import { useToasts } from '@/store/useToasts';
import { useUI } from '@/store/useUI';

export interface Shortcut {
  keys: string;
  description: string;
  group: 'Navigation' | 'Actions' | 'View';
}

export const SHORTCUTS: Shortcut[] = [
  { keys: 'Ctrl K', description: 'Open the command palette', group: 'Actions' },
  { keys: 'N', description: 'Add a task', group: 'Actions' },
  { keys: 'Shift N', description: 'New checklist', group: 'Actions' },
  { keys: '/', description: 'Jump to search', group: 'Actions' },
  { keys: 'F', description: 'Toggle focus mode', group: 'View' },
  { keys: 'Ctrl Shift L', description: 'Switch light and dark', group: 'View' },
  { keys: 'G then D', description: 'Go to dashboard', group: 'Navigation' },
  { keys: 'G then C', description: 'Go to checklists', group: 'Navigation' },
  { keys: 'G then A', description: 'Go to analytics', group: 'Navigation' },
  { keys: 'G then T', description: 'Go to templates', group: 'Navigation' },
  { keys: 'G then S', description: 'Go to settings', group: 'Navigation' },
  { keys: 'Esc', description: 'Close dialogs, clear selection', group: 'Actions' },
  { keys: '?', description: 'Show this list', group: 'Actions' },
];

function isTyping(target: EventTarget | null): boolean {
  const node = target as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
}

/** Registered once, at the app shell. `g` acts as a leader key for navigation. */
export function useShortcuts(): void {
  const navigate = useNavigate();

  useEffect(() => {
    let leader = false;
    let leaderTimer = 0;

    const handler = (event: KeyboardEvent) => {
      const ui = useUI.getState();
      const prefs = usePrefs.getState();
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        ui.setCommandOpen(!ui.commandOpen);
        return;
      }
      if (meta && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        const next = prefs.theme === 'dark' ? 'light' : 'dark';
        prefs.set('theme', next);
        useToasts.getState().push(`Switched to ${next} theme`);
        return;
      }
      if (event.key === 'Escape') {
        if (ui.selection.length) ui.clearSelection();
        return;
      }
      if (meta || event.altKey || isTyping(event.target)) return;

      if (leader) {
        const routes: Record<string, string> = {
          d: '/',
          c: '/checklists',
          a: '/analytics',
          t: '/templates',
          s: '/settings',
          m: '/matrix',
          r: '/archive',
        };
        const path = routes[event.key.toLowerCase()];
        leader = false;
        window.clearTimeout(leaderTimer);
        if (path) {
          event.preventDefault();
          navigate(path);
        }
        return;
      }

      switch (event.key) {
        case 'g':
        case 'G':
          leader = true;
          leaderTimer = window.setTimeout(() => {
            leader = false;
          }, 1400);
          break;
        case 'n':
          event.preventDefault();
          ui.setQuickAddOpen(true);
          break;
        case 'N':
          event.preventDefault();
          navigate('/checklists?new=1');
          break;
        case '/':
          event.preventDefault();
          document.getElementById('global-search')?.focus();
          break;
        case 'f':
          event.preventDefault();
          ui.toggleFocusMode();
          break;
        case '?':
          event.preventDefault();
          ui.setShortcutsOpen(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.clearTimeout(leaderTimer);
    };
  }, [navigate]);
}
