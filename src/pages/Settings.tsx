import { Download, Save, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { estimateUsage } from '@/lib/db';
import { formatDateTime, timeAgo } from '@/lib/date';
import {
  buildPayload,
  download,
  formatBytes,
  parseImport,
  readFile,
  stamp,
  tasksToCSV,
} from '@/lib/transfer';
import { Button, Card, SectionHeading, Segmented, Switch } from '@/components/ui/primitives';
import { Field, Select } from '@/components/ui/fields';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useData } from '@/store/useData';
import { DEFAULT_PREFS, usePrefs } from '@/store/usePrefs';
import { useToasts } from '@/store/useToasts';
import type { BackupRecord, DateFormat, ThemeMode, ViewMode } from '@/types';

export default function Settings() {
  const prefs = usePrefs();
  const setPref = usePrefs((state) => state.set);
  const data = useData();
  const push = useToasts((state) => state.push);

  const fileInput = useRef<HTMLInputElement>(null);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [confirmReset, setConfirmReset] = useState(false);
  const [restoring, setRestoring] = useState<BackupRecord | null>(null);

  const refresh = async () => {
    setBackups(await data.listBackups());
    setUsage(await estimateUsage());
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportJSON = () => {
    download(
      `smart-checklist-${stamp()}.json`,
      JSON.stringify(buildPayload(data), null, 2),
      'application/json',
    );
    push('Exported a JSON backup.', { tone: 'success' });
  };

  const exportCSV = () => {
    download(`smart-checklist-tasks-${stamp()}.csv`, tasksToCSV(data.checklists, data.tasks), 'text/csv');
    push('Exported tasks as CSV.', { tone: 'success' });
  };

  const onImport = async (file: File) => {
    try {
      const { payload, warnings } = parseImport(await readFile(file));
      await data.importPayload(payload, importMode);
      warnings.slice(0, 2).forEach((warning) => push(warning));
      push(
        `Imported ${payload.checklists.length} checklists and ${payload.tasks.length} tasks.`,
        { tone: 'success' },
      );
      void refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : 'That file could not be imported.', {
        tone: 'danger',
      });
    }
  };

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') {
      push('This browser does not support notifications.', { tone: 'danger' });
      return;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setPref('notifications', true);
      push('Reminders are on.', { tone: 'success' });
    } else {
      setPref('notifications', false);
      push('Permission was declined, so reminders will show as in-app messages.', { tone: 'danger' });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl text-limestone">Settings</h1>
        <p className="mt-0.5 text-sm text-steel">
          Preferences are stored in this browser. Your checklists live in IndexedDB on this device.
        </p>
      </div>

      <Card className="p-4">
        <SectionHeading title="Appearance" />
        <div className="space-y-1 divide-y">
          <Field label="Theme">
            <Segmented
              ariaLabel="Theme"
              value={prefs.theme}
              onChange={(value) => setPref('theme', value as ThemeMode)}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
          </Field>
          <Switch
            checked={prefs.highContrast}
            onChange={(value) => setPref('highContrast', value)}
            label="High contrast"
            hint="Removes the translucent surfaces and raises edge contrast."
          />
          <Switch
            checked={prefs.reduceMotion}
            onChange={(value) => setPref('reduceMotion', value)}
            label="Reduce motion"
            hint="Turns off transitions, in addition to any system setting."
          />
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeading title="Dates and views" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date format">
            <Select
              value={prefs.dateFormat}
              onChange={(event) => setPref('dateFormat', event.target.value as DateFormat)}
            >
              <option value="d MMM yyyy">4 Mar 2026</option>
              <option value="dd/MM/yyyy">04/03/2026</option>
              <option value="MM/dd/yyyy">03/04/2026</option>
              <option value="yyyy-MM-dd">2026-03-04</option>
            </Select>
          </Field>
          <Field label="Week starts on">
            <Select
              value={String(prefs.weekStartsOn)}
              onChange={(event) => setPref('weekStartsOn', Number(event.target.value) === 0 ? 0 : 1)}
            >
              <option value="1">Monday</option>
              <option value="0">Sunday</option>
            </Select>
          </Field>
          <Field label="Default view" hint="Used when a checklist has no view of its own.">
            <Select
              value={prefs.defaultView}
              onChange={(event) => setPref('defaultView', event.target.value as ViewMode)}
            >
              <option value="list">List</option>
              <option value="kanban">Board</option>
              <option value="calendar">Calendar</option>
              <option value="timeline">Timeline</option>
              <option value="compact">Compact</option>
            </Select>
          </Field>
        </div>
        <div className="mt-2 divide-y">
          <Switch
            checked={prefs.confirmDelete}
            onChange={(value) => setPref('confirmDelete', value)}
            label="Confirm before deleting"
            hint="Deletions can also be undone from the toast that appears."
          />
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeading title="Reminders" hint="Reminders fire while the app is open in a tab." />
        <div className="divide-y">
          <Switch
            checked={prefs.notifications}
            onChange={(value) => {
              if (value) void requestNotifications();
              else setPref('notifications', false);
            }}
            label="Show reminder notifications"
            hint={
              typeof Notification !== 'undefined' && Notification.permission === 'denied'
                ? 'Blocked in browser settings — reminders will appear as in-app messages instead.'
                : 'Asks for browser permission the first time.'
            }
          />
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Field label="Focus minutes">
            <Select
              value={String(prefs.pomodoroFocus)}
              onChange={(event) => setPref('pomodoroFocus', Number(event.target.value))}
            >
              {[15, 20, 25, 30, 45, 50].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Short break">
            <Select
              value={String(prefs.pomodoroBreak)}
              onChange={(event) => setPref('pomodoroBreak', Number(event.target.value))}
            >
              {[3, 5, 8, 10].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Long break">
            <Select
              value={String(prefs.pomodoroLongBreak)}
              onChange={(event) => setPref('pomodoroLongBreak', Number(event.target.value))}
            >
              {[10, 15, 20, 30].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeading
          title="Your data"
          hint={
            usage
              ? `${formatBytes(usage.usage)} used of roughly ${formatBytes(usage.quota)} available`
              : 'Export regularly — clearing site data removes everything.'
          }
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportJSON}>
            <Download size={15} />
            Export JSON
          </Button>
          <Button onClick={exportCSV}>
            <Download size={15} />
            Export CSV
          </Button>
          <Button onClick={() => fileInput.current?.click()}>
            <Upload size={15} />
            Import JSON
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImport(file);
              event.target.value = '';
            }}
          />
          <Segmented
            ariaLabel="Import mode"
            value={importMode}
            onChange={setImportMode}
            options={[
              { value: 'merge', label: 'Merge' },
              { value: 'replace', label: 'Replace' },
            ]}
          />
        </div>
        <p className="mt-2 text-2xs text-steel">
          Merge keeps what you have and adds anything new. Replace wipes this device first.
        </p>

        <div className="mt-4 divide-y border-t pt-3">
          <Switch
            checked={prefs.autoBackup}
            onChange={(value) => setPref('autoBackup', value)}
            label="Automatic daily backup"
            hint="Keeps recent snapshots inside the app so you can roll back."
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Field label="Snapshots kept" className="w-32">
            <Select
              value={String(prefs.autoBackupKeep)}
              onChange={(event) => setPref('autoBackupKeep', Number(event.target.value))}
            >
              {[3, 5, 10, 20].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            className="mt-5"
            onClick={() =>
              void data.createBackup(false, prefs.autoBackupKeep).then(() => {
                push('Snapshot created.', { tone: 'success' });
                void refresh();
              })
            }
          >
            <Save size={15} />
            Take a snapshot now
          </Button>
        </div>

        {backups.length ? (
          <ul className="mt-3 divide-y rounded-control border">
            {backups.map((backup) => (
              <li key={backup.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-limestone">
                    {formatDateTime(backup.createdAt, prefs.dateFormat)}
                    <span className="ml-2 text-2xs text-steel">
                      {backup.automatic ? 'automatic' : 'manual'} · {formatBytes(backup.size)}
                    </span>
                  </p>
                  <p className="text-2xs text-steel">
                    {backup.payload.checklists.length} checklists, {backup.payload.tasks.length} tasks ·{' '}
                    {timeAgo(backup.createdAt)}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setRestoring(backup)}>
                  <RotateCcw size={14} />
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    download(
                      `smart-checklist-snapshot-${stamp()}.json`,
                      JSON.stringify(backup.payload, null, 2),
                      'application/json',
                    )
                  }
                >
                  <Download size={14} />
                  Download
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-critical"
                  aria-label="Delete snapshot"
                  onClick={() => void data.deleteBackup(backup.id).then(refresh)}
                >
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card className="border-critical/30 p-4">
        <SectionHeading
          title="Start over"
          hint="Removes every checklist, task, template and snapshot from this device."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            <Trash2 size={15} />
            Delete all data
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              usePrefs.getState().reset();
              push('Preferences reset to defaults.');
            }}
          >
            Reset preferences only
          </Button>
        </div>
        <p className="mt-2 text-2xs text-steel">
          Export first if you might want it back — this cannot be undone.
        </p>
      </Card>

      <p className="pb-2 text-center text-2xs text-steel">
        Smart Checklist · offline-first · default theme {DEFAULT_PREFS.theme}
      </p>

      <ConfirmDialog
        open={confirmReset}
        title="Delete everything?"
        body="All checklists, tasks, templates, saved views and snapshots on this device will be removed. This cannot be undone."
        confirmLabel="Delete it all"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void data.resetAll().then(() => {
            push('All data deleted.', { tone: 'danger' });
            void refresh();
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(restoring)}
        title="Restore this snapshot?"
        body="Everything currently on this device is replaced by the contents of the snapshot."
        confirmLabel="Restore"
        onCancel={() => setRestoring(null)}
        onConfirm={() => {
          const target = restoring;
          setRestoring(null);
          if (!target) return;
          void data
            .restoreBackup(target.id)
            .then(() => push('Snapshot restored.', { tone: 'success' }))
            .catch((error) =>
              push(error instanceof Error ? error.message : 'Restore failed.', { tone: 'danger' }),
            );
        }}
      />
    </div>
  );
}
