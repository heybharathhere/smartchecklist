import { LayoutTemplate, Play, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { color as colorOf, icon as iconOf } from '@/lib/palette';
import { Badge, Button, Card, EmptyState } from '@/components/ui/primitives';
import { Input } from '@/components/ui/fields';
import { Modal } from '@/components/ui/Modal';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import { useToasts } from '@/store/useToasts';
import type { Template, TemplateTask } from '@/types';

function countTasks(tasks: TemplateTask[]): number {
  return tasks.reduce((sum, task) => sum + 1 + countTasks(task.children ?? []), 0);
}

function TaskOutline({ tasks, depth = 0 }: { tasks: TemplateTask[]; depth?: number }) {
  return (
    <ul className={cn('space-y-1', depth ? 'mt-1' : '')}>
      {tasks.map((task, index) => (
        <li key={`${task.title}-${index}`} style={{ marginLeft: depth * 14 }}>
          <span className="text-sm text-limestone">{task.title}</span>
          {task.children?.length ? <TaskOutline tasks={task.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}

export default function Templates() {
  const templates = useData((state) => state.templates);
  const createFromTemplate = useData((state) => state.createFromTemplate);
  const deleteTemplate = useData((state) => state.deleteTemplate);
  const confirmDelete = usePrefs((state) => state.confirmDelete);
  const push = useToasts((state) => state.push);
  const navigate = useNavigate();

  const [starting, setStarting] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<Template | null>(null);

  const start = async () => {
    if (!starting) return;
    const created = await createFromTemplate(starting.id, name);
    setStarting(null);
    if (created) {
      push(`Started ${created.title}.`, { tone: 'success' });
      navigate(`/checklists/${created.id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl text-limestone">Templates</h1>
        <p className="mt-0.5 text-sm text-steel">
          Start a checklist with its tasks already laid out. Save any checklist as a template from
          its card menu.
        </p>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate size={26} />}
          title="No templates"
          body="Save a checklist as a template and it will appear here."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const spec = colorOf(template.color);
            const Icon = iconOf(template.icon);
            const total = countTasks(template.tasks);
            return (
              <Card key={template.id} className="flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-control"
                    style={{ backgroundColor: `${spec.hex}22`, color: spec.hex }}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[0.98rem] font-semibold leading-snug text-limestone">
                      {template.name}
                    </h2>
                    <p className="mt-1 text-sm leading-snug text-steel">{template.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {template.category ? (
                        <Badge className={cn('border-transparent', spec.tint, spec.text)}>
                          {template.category}
                        </Badge>
                      ) : null}
                      <Badge className="border-hairline text-steel">
                        {total} {total === 1 ? 'task' : 'tasks'}
                      </Badge>
                      {template.builtIn ? (
                        <Badge className="border-hairline text-steel">built in</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t pt-3">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setStarting(template);
                      setName(template.name);
                    }}
                  >
                    <Play size={14} />
                    Use template
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPreview(template)}>
                    Preview
                  </Button>
                  {template.builtIn ? null : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto text-critical"
                      aria-label={`Delete template ${template.name}`}
                      onClick={() => {
                        if (confirmDelete && !window.confirm(`Delete the template “${template.name}”?`)) return;
                        void deleteTemplate(template.id).then(() => push('Template deleted.'));
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(starting)}
        onClose={() => setStarting(null)}
        title="Name the new checklist"
        description={
          starting
            ? `${countTasks(starting.tasks)} tasks will be created, with relative due dates applied from today.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStarting(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={start} disabled={!name.trim()}>
              Create checklist
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void start();
          }}
          aria-label="Checklist name"
        />
      </Modal>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.name ?? 'Template'}
        description={preview?.description}
        size="md"
      >
        {preview ? <TaskOutline tasks={preview.tasks} /> : null}
      </Modal>
    </div>
  );
}
