import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Archive,
  ArchiveRestore,
  Copy,
  GripVertical,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Pin,
  Star,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/date';
import { color as colorOf, icon as iconOf } from '@/lib/palette';
import { progressOfChecklist } from '@/lib/tasks';
import { Badge, ProgressBar } from '@/components/ui/primitives';
import { Menu } from '@/components/ui/Menu';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import { useToasts } from '@/store/useToasts';
import type { Checklist } from '@/types';

export function ChecklistCard({
  checklist,
  draggable = true,
  onEdit,
  onSaveAsTemplate,
}: {
  checklist: Checklist;
  draggable?: boolean;
  onEdit: (id: string) => void;
  onSaveAsTemplate?: (id: string) => void;
}) {
  const tasks = useData((state) => state.tasks);
  const updateChecklist = useData((state) => state.updateChecklist);
  const duplicateChecklist = useData((state) => state.duplicateChecklist);
  const deleteChecklist = useData((state) => state.deleteChecklist);
  const confirmDelete = usePrefs((state) => state.confirmDelete);
  const push = useToasts((state) => state.push);

  const sortable = useSortable({ id: checklist.id, disabled: !draggable });
  const progress = progressOfChecklist(tasks, checklist.id);
  const spec = colorOf(checklist.color);
  const Icon = iconOf(checklist.icon);

  return (
    <article
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-card border transition-colors hover:border-steel/40',
        sortable.isDragging && 'z-10 shadow-float',
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: spec.hex }}
      />

      <div className="flex items-start gap-3 p-4 pl-5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-control"
          style={{ backgroundColor: `${spec.hex}22`, color: spec.hex }}
        >
          <Icon size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <Link
              to={`/checklists/${checklist.id}`}
              className="min-w-0 flex-1 font-display text-[0.98rem] font-semibold leading-snug text-limestone hover:text-copper"
            >
              {checklist.title}
            </Link>
            {checklist.pinned ? <Pin size={13} className="mt-0.5 shrink-0 text-copper" /> : null}
            {checklist.favorite ? (
              <Star size={13} className="mt-0.5 shrink-0 fill-copper text-copper" />
            ) : null}
          </div>

          {checklist.description ? (
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-steel">{checklist.description}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {checklist.category ? (
              <Badge className={cn('border-transparent', spec.tint, spec.text)}>{checklist.category}</Badge>
            ) : null}
            {checklist.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} className="border-hairline text-steel">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {draggable ? (
            <button
              {...sortable.attributes}
              {...sortable.listeners}
              aria-label={`Reorder ${checklist.title}`}
              className="cursor-grab touch-none rounded-control p-1 text-steel/0 transition-colors group-hover:text-steel/70 focus-visible:text-steel active:cursor-grabbing"
            >
              <GripVertical size={15} />
            </button>
          ) : null}
          <Menu
            label={`Actions for ${checklist.title}`}
            items={[
              { label: 'Edit checklist', icon: <Pencil size={14} />, onSelect: () => onEdit(checklist.id) },
              {
                label: checklist.pinned ? 'Unpin' : 'Pin to sidebar',
                icon: <Pin size={14} />,
                onSelect: () => void updateChecklist(checklist.id, { pinned: !checklist.pinned }),
              },
              {
                label: checklist.favorite ? 'Remove favourite' : 'Mark favourite',
                icon: <Star size={14} />,
                onSelect: () => void updateChecklist(checklist.id, { favorite: !checklist.favorite }),
              },
              {
                label: 'Duplicate',
                icon: <Copy size={14} />,
                separated: true,
                onSelect: () =>
                  void duplicateChecklist(checklist.id).then(() =>
                    push('Checklist duplicated.', { tone: 'success' }),
                  ),
              },
              ...(onSaveAsTemplate
                ? [
                    {
                      label: 'Save as template',
                      icon: <LayoutTemplate size={14} />,
                      onSelect: () => onSaveAsTemplate(checklist.id),
                    },
                  ]
                : []),
              {
                label: checklist.archived ? 'Restore from archive' : 'Archive',
                icon: checklist.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />,
                separated: true,
                onSelect: () =>
                  void updateChecklist(checklist.id, { archived: !checklist.archived }).then(() =>
                    push(checklist.archived ? 'Restored.' : 'Archived.', { tone: 'success' }),
                  ),
              },
              {
                label: 'Delete',
                icon: <Trash2 size={14} />,
                danger: true,
                onSelect: () => {
                  if (
                    confirmDelete &&
                    !window.confirm(`Delete “${checklist.title}” and its ${progress.total} tasks?`)
                  ) {
                    return;
                  }
                  void deleteChecklist(checklist.id).then(() => {
                    const undo = useData.getState().undo;
                    push(`Deleted ${checklist.title}.`, {
                      tone: 'danger',
                      undo: undo ? () => void undo.run() : undefined,
                    });
                  });
                },
              },
            ]}
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                aria-label={`More actions for ${checklist.title}`}
                className="rounded-control p-1 text-steel hover:bg-steel/12 hover:text-limestone"
              >
                <MoreHorizontal size={16} />
              </button>
            )}
          />
        </div>
      </div>

      <div className="mt-auto border-t px-4 py-3 pl-5">
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-2xs text-steel">
          <span className="tabular">
            {progress.done} of {progress.total} done
            {progress.overdue ? (
              <span className="ml-1.5 font-medium text-critical">{progress.overdue} late</span>
            ) : null}
          </span>
          <span className="tabular">{progress.percent}%</span>
        </div>
        <ProgressBar percent={progress.percent} tone="bg-teal" label={`${checklist.title} progress`} />
        <p className="mt-2 text-2xs text-steel/80">
          {checklist.lastOpenedAt ? `Opened ${timeAgo(checklist.lastOpenedAt)}` : `Created ${timeAgo(checklist.createdAt)}`}
        </p>
      </div>
    </article>
  );
}
