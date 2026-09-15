import { useEffect, useRef } from 'react';
import { getMeta } from '@/lib/db';
import { useData } from '@/store/useData';
import { usePrefs } from '@/store/usePrefs';
import { useToasts } from '@/store/useToasts';

const MINUTE = 60_000;

/**
 * Fires local notifications for tasks whose reminder time has passed.
 * Checks once a minute and on tab focus; each reminder fires once.
 */
export function useReminders(): void {
  const ready = useData((state) => state.ready);
  const notifications = usePrefs((state) => state.notifications);

  useEffect(() => {
    if (!ready || !notifications) return;

    const sweep = async () => {
      const { tasks, updateTask } = useData.getState();
      const now = Date.now();
      const due = tasks.filter(
        (task) => !task.completed && !task.reminderFired && task.reminderAt && task.reminderAt <= now,
      );
      for (const task of due) {
        const body = task.dueDate ? `Due ${task.dueDate}` : 'Reminder';
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(task.title, { body, tag: task.id, icon: './icons/icon-192.png' });
          } catch {
            useToasts.getState().push(`Reminder: ${task.title}`);
          }
        } else {
          useToasts.getState().push(`Reminder: ${task.title}`);
        }
        await updateTask(task.id, { reminderFired: true, reminderAt: task.reminderAt });
      }
    };

    void sweep();
    const timer = window.setInterval(sweep, MINUTE);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sweep();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ready, notifications]);
}

/** Writes a rolling snapshot into IndexedDB at most once a day. */
export function useAutoBackup(): void {
  const ready = useData((state) => state.ready);
  const autoBackup = usePrefs((state) => state.autoBackup);
  const keep = usePrefs((state) => state.autoBackupKeep);
  const done = useRef(false);

  useEffect(() => {
    if (!ready || !autoBackup || done.current) return;
    done.current = true;
    void (async () => {
      const last = (await getMeta<number>('lastBackupAt')) ?? 0;
      const day = 24 * 60 * MINUTE;
      const { checklists, createBackup } = useData.getState();
      if (!checklists.length) return;
      if (Date.now() - last < day) return;
      await createBackup(true, keep);
    })();
  }, [ready, autoBackup, keep]);
}

/** Reports connectivity changes once the app has loaded. */
export function useConnectivityToasts(): void {
  useEffect(() => {
    const offline = () => useToasts.getState().push('Offline. Changes are saved on this device.');
    const online = () => useToasts.getState().push('Back online.', { tone: 'success' });
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, []);
}
