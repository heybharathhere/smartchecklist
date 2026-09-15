import {
  Archive,
  BarChart3,
  ChevronsLeft,
  LayoutGrid,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  LayoutTemplate,
  Plus,
  Settings,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { color as colorOf, icon as iconOf } from '@/lib/palette';
import { progressOfChecklist } from '@/lib/tasks';
import { Button } from '@/components/ui/primitives';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/checklists', label: 'Checklists', Icon: ListChecks, end: false },
  { to: '/tasks', label: 'All tasks', Icon: ListTodo, end: false },
  { to: '/analytics', label: 'Analytics', Icon: BarChart3, end: false },
  { to: '/matrix', label: 'Priority matrix', Icon: LayoutGrid, end: false },
  { to: '/templates', label: 'Templates', Icon: LayoutTemplate, end: false },
  { to: '/archive', label: 'Archive', Icon: Archive, end: false },
  { to: '/settings', label: 'Settings', Icon: Settings, end: false },
];

export function Sidebar() {
  const collapsed = usePrefs((state) => state.sidebarCollapsed);
  const setPref = usePrefs((state) => state.set);
  const checklists = useData((state) => state.checklists);
  const tasks = useData((state) => state.tasks);
  const navigate = useNavigate();

  const quickAccess = checklists
    .filter((list) => !list.archived && (list.pinned || list.favorite))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.order - b.order)
    .slice(0, 7);

  return (
    <aside
      className={cn(
        'no-print sticky top-0 hidden h-screen shrink-0 flex-col border-r lg:flex',
        collapsed ? 'w-[4.5rem]' : 'w-[16.5rem]',
        'transition-[width] duration-200 ease-swift',
      )}
    >
      <div className={cn('flex items-center gap-2.5 px-4 py-5', collapsed && 'justify-center px-2')}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-copper text-ink">
          <ListChecks size={19} />
        </span>
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="truncate font-display text-[0.95rem] font-semibold text-limestone">
              Smart Checklist
            </p>
            <p className="truncate text-2xs text-steel">Everything stays on this device</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors',
                    collapsed && 'justify-center px-2',
                    isActive
                      ? 'bg-copper/12 text-copper'
                      : 'text-steel hover:bg-steel/8 hover:text-limestone',
                  )
                }
              >
                <Icon size={18} className="shrink-0" />
                {collapsed ? <span className="sr-only">{label}</span> : <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        {!collapsed && quickAccess.length ? (
          <div className="mt-6">
            <p className="px-3 pb-1.5 text-2xs font-medium text-steel">Pinned</p>
            <ul className="space-y-0.5">
              {quickAccess.map((list) => {
                const Icon = iconOf(list.icon);
                const spec = colorOf(list.color);
                const progress = progressOfChecklist(tasks, list.id);
                return (
                  <li key={list.id}>
                    <NavLink
                      to={`/checklists/${list.id}`}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors',
                          isActive ? 'bg-steel/12 text-limestone' : 'text-steel hover:bg-steel/8 hover:text-limestone',
                        )
                      }
                    >
                      <Icon size={15} style={{ color: spec.hex }} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{list.title}</span>
                      <span className="tabular text-2xs text-steel">{progress.percent}%</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </nav>

      <div className={cn('border-t p-2.5', collapsed && 'flex flex-col items-center gap-2')}>
        <Button
          variant="primary"
          size={collapsed ? 'icon' : 'md'}
          className={collapsed ? '' : 'w-full'}
          onClick={() => navigate('/checklists?new=1')}
        >
          <Plus size={16} />
          {collapsed ? <span className="sr-only">New checklist</span> : 'New checklist'}
        </Button>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn('mt-2', collapsed ? 'mt-0' : 'w-full justify-start')}
          onClick={() => setPref('sidebarCollapsed', !collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronsLeft size={16} className={cn('transition-transform', collapsed && 'rotate-180')} />
          {collapsed ? null : 'Collapse'}
        </Button>
      </div>
    </aside>
  );
}
