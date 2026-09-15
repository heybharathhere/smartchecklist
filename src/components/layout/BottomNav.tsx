import { BarChart3, LayoutDashboard, ListChecks, ListTodo, Plus } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useUI } from '@/store/useUI';

const ITEMS = [
  { to: '/', label: 'Home', Icon: LayoutDashboard, end: true },
  { to: '/checklists', label: 'Lists', Icon: ListChecks, end: false },
  { to: '/tasks', label: 'Tasks', Icon: ListTodo, end: false },
  { to: '/analytics', label: 'Stats', Icon: BarChart3, end: false },
];

export function BottomNav() {
  const setQuickAddOpen = useUI((state) => state.setQuickAddOpen);

  return (
    <nav
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t glass pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5 items-end">
        {ITEMS.slice(0, 2).map((item) => (
          <BottomItem key={item.to} {...item} />
        ))}
        <li className="flex justify-center">
          <button
            onClick={() => setQuickAddOpen(true)}
            aria-label="Add task"
            className="-mt-5 grid h-12 w-12 place-items-center rounded-full bg-copper text-ink shadow-float active:brightness-95"
          >
            <Plus size={22} />
          </button>
        </li>
        {ITEMS.slice(2).map((item) => (
          <BottomItem key={item.to} {...item} />
        ))}
      </ul>
    </nav>
  );
}

function BottomItem({
  to,
  label,
  Icon,
  end,
}: {
  to: string;
  label: string;
  Icon: typeof ListChecks;
  end: boolean;
}) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center gap-0.5 py-2.5 text-2xs transition-colors',
            isActive ? 'text-copper' : 'text-steel',
          )
        }
      >
        <Icon size={20} />
        {label}
      </NavLink>
    </li>
  );
}
