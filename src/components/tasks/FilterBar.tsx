import { Bookmark, Filter, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { PRIORITIES } from '@/lib/palette';
import { isFilterActive, uniqueCategories, uniqueTags } from '@/lib/tasks';
import { Badge, Button } from '@/components/ui/primitives';
import { Input, Select } from '@/components/ui/fields';
import { Menu } from '@/components/ui/Menu';
import { useData } from '@/store/useData';
import { useToasts } from '@/store/useToasts';
import { useUI } from '@/store/useUI';
import type { DueFilter, Priority, SortKey, StatusFilter } from '@/types';

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: 'any', label: 'Any date' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'tomorrow', label: 'Due tomorrow' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'month', label: 'Next 31 days' },
  { value: 'none', label: 'No due date' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'manual', label: 'Manual order' },
  { value: 'smart', label: 'Smart order' },
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Newest first' },
  { value: 'alpha', label: 'A to Z' },
];

export function FilterBar({
  showCategories = false,
  showSearch = true,
}: {
  showCategories?: boolean;
  showSearch?: boolean;
}) {
  const filter = useUI((state) => state.filter);
  const setFilter = useUI((state) => state.setFilter);
  const resetFilter = useUI((state) => state.resetFilter);
  const applyFilter = useUI((state) => state.applyFilter);
  const checklists = useData((state) => state.checklists);
  const tasks = useData((state) => state.tasks);
  const savedFilters = useData((state) => state.savedFilters);
  const saveFilter = useData((state) => state.saveFilter);
  const deleteFilter = useData((state) => state.deleteFilter);
  const push = useToasts((state) => state.push);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const tags = uniqueTags(tasks, checklists);
  const categories = uniqueCategories(checklists);
  const active = isFilterActive(filter);

  const togglePriority = (value: Priority) =>
    setFilter({
      priorities: filter.priorities.includes(value)
        ? filter.priorities.filter((p) => p !== value)
        : [...filter.priorities, value],
    });

  const toggleTag = (value: string) =>
    setFilter({
      tags: filter.tags.includes(value) ? filter.tags.filter((t) => t !== value) : [...filter.tags, value],
    });

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {showSearch ? (
          <div className="relative min-w-[12rem] flex-1">
            <Input
              value={filter.query}
              onChange={(event) => setFilter({ query: event.target.value })}
              placeholder="Filter these tasks"
              aria-label="Filter tasks"
              className="h-9"
            />
            {filter.query ? (
              <button
                onClick={() => setFilter({ query: '' })}
                aria-label="Clear filter text"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-steel hover:text-limestone"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>
        ) : null}

        <Select
          value={filter.status}
          onChange={(event) => setFilter({ status: event.target.value as StatusFilter })}
          className="h-9 w-auto"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          value={filter.due}
          onChange={(event) => setFilter({ due: event.target.value as DueFilter })}
          className="h-9 w-auto"
          aria-label="Filter by due date"
        >
          {DUE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Menu
          label="Filter by priority"
          align="left"
          items={PRIORITIES.map((option) => ({
            label: `${filter.priorities.includes(option.key) ? '✓ ' : ''}${option.label}`,
            onSelect: () => togglePriority(option.key),
          }))}
          trigger={({ toggle }) => (
            <Button size="sm" variant="secondary" onClick={toggle}>
              <Filter size={14} />
              Priority
              {filter.priorities.length ? (
                <span className="tabular text-copper">{filter.priorities.length}</span>
              ) : null}
            </Button>
          )}
        />

        {tags.length ? (
          <Menu
            label="Filter by tag"
            align="left"
            items={tags.slice(0, 40).map((tag) => ({
              label: `${filter.tags.includes(tag) ? '✓ ' : ''}#${tag}`,
              onSelect: () => toggleTag(tag),
            }))}
            trigger={({ toggle }) => (
              <Button size="sm" variant="secondary" onClick={toggle}>
                Tags
                {filter.tags.length ? <span className="tabular text-copper">{filter.tags.length}</span> : null}
              </Button>
            )}
          />
        ) : null}

        {showCategories && categories.length ? (
          <Menu
            label="Filter by category"
            align="left"
            items={categories.map((category) => ({
              label: `${filter.categories.includes(category) ? '✓ ' : ''}${category}`,
              onSelect: () =>
                setFilter({
                  categories: filter.categories.includes(category)
                    ? filter.categories.filter((c) => c !== category)
                    : [...filter.categories, category],
                }),
            }))}
            trigger={({ toggle }) => (
              <Button size="sm" variant="secondary" onClick={toggle}>
                Category
                {filter.categories.length ? (
                  <span className="tabular text-copper">{filter.categories.length}</span>
                ) : null}
              </Button>
            )}
          />
        ) : null}

        <Select
          value={filter.sort}
          onChange={(event) => setFilter({ sort: event.target.value as SortKey })}
          className="h-9 w-auto"
          aria-label="Sort tasks"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {savedFilters.length ? (
            <Menu
              label="Saved views"
              items={savedFilters
                .map((saved) => ({
                  label: saved.name,
                  icon: <Bookmark size={14} />,
                  onSelect: () => applyFilter(saved.filter),
                }))
                .concat(
                  savedFilters.map((saved) => ({
                    label: `Delete “${saved.name}”`,
                    icon: <Trash2 size={14} />,
                    onSelect: () => void deleteFilter(saved.id),
                  })),
                )}
              trigger={({ toggle }) => (
                <Button size="sm" variant="ghost" onClick={toggle}>
                  <Bookmark size={14} />
                  Saved views
                </Button>
              )}
            />
          ) : null}

          {active ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setNaming(true)}>
                Save view
              </Button>
              <Button size="sm" variant="ghost" onClick={resetFilter}>
                <X size={14} />
                Clear
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {naming ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setNaming(false);
              if (event.key === 'Enter' && name.trim()) {
                void saveFilter(name, filter).then(() => push('View saved.', { tone: 'success' }));
                setName('');
                setNaming(false);
              }
            }}
            placeholder="Name this view, e.g. Overdue and critical"
            className="h-9 max-w-xs"
            aria-label="Name for the saved view"
          />
          <Button
            size="sm"
            variant="primary"
            disabled={!name.trim()}
            onClick={() => {
              void saveFilter(name, filter).then(() => push('View saved.', { tone: 'success' }));
              setName('');
              setNaming(false);
            }}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNaming(false)}>
            Cancel
          </Button>
        </div>
      ) : null}

      {active ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {filter.priorities.map((value) => (
            <Badge key={value} className="border-hairline text-steel">
              <button onClick={() => togglePriority(value)} className="inline-flex items-center gap-1">
                {value}
                <X size={10} />
              </button>
            </Badge>
          ))}
          {filter.tags.map((value) => (
            <Badge key={value} className="border-hairline text-steel">
              <button onClick={() => toggleTag(value)} className="inline-flex items-center gap-1">
                #{value}
                <X size={10} />
              </button>
            </Badge>
          ))}
          {filter.due !== 'any' ? (
            <Badge className={cn('border-hairline text-steel')}>
              <button onClick={() => setFilter({ due: 'any' })} className="inline-flex items-center gap-1">
                {DUE_OPTIONS.find((option) => option.value === filter.due)?.label}
                <X size={10} />
              </button>
            </Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
