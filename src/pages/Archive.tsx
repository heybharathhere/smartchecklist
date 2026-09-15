import { Archive as ArchiveIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState } from '@/components/ui/primitives';
import { ChecklistCard } from '@/components/checklists/ChecklistCard';
import {
  ChecklistDialog,
  checklistDraftFrom,
  type ChecklistDraft,
} from '@/components/checklists/ChecklistDialog';
import { progressOfChecklist } from '@/lib/tasks';
import { useData } from '@/store/useData';

export default function ArchivePage() {
  const checklists = useData((state) => state.checklists);
  const tasks = useData((state) => state.tasks);
  const [draft, setDraft] = useState<ChecklistDraft | null>(null);

  const archived = checklists
    .filter((checklist) => checklist.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const totalTasks = archived.reduce(
    (sum, checklist) => sum + progressOfChecklist(tasks, checklist.id).total,
    0,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl text-limestone">Archive</h1>
        <p className="mt-0.5 text-sm text-steel">
          {archived.length
            ? `${archived.length} archived ${archived.length === 1 ? 'checklist' : 'checklists'} holding ${totalTasks} tasks. Archived work is excluded from the dashboard and analytics.`
            : 'Archived checklists are kept here, out of the dashboard and analytics.'}
        </p>
      </div>

      {archived.length === 0 ? (
        <EmptyState
          icon={<ArchiveIcon size={26} />}
          title="Nothing archived"
          body="Archive a checklist when it is finished but worth keeping. It stays searchable here."
          action={
            <Link to="/checklists">
              <Button variant="primary">Back to checklists</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {archived.map((checklist) => (
            <ChecklistCard
              key={checklist.id}
              checklist={checklist}
              draggable={false}
              onEdit={(id) => {
                const target = checklists.find((candidate) => candidate.id === id);
                if (target) setDraft(checklistDraftFrom(target));
              }}
            />
          ))}
        </div>
      )}

      <ChecklistDialog draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
