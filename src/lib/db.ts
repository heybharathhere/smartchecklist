/**
 * IndexedDB access layer.
 *
 * Schema (database "smart-checklist", version 1)
 *   checklists    key: id          indexes: order, archived, category
 *   tasks         key: id          indexes: checklistId, parentId, dueDate, completed, status
 *   activity      key: id          indexes: ts
 *   templates     key: id
 *   filters       key: id
 *   backups       key: id          indexes: createdAt
 *   meta          key: key         (schema/bookkeeping values)
 *
 * No third-party IndexedDB wrapper: everything the app needs is ~120 lines and
 * one less dependency to keep in step.
 */

export const DB_NAME = 'smart-checklist';
export const DB_VERSION = 1;

export type StoreName =
  | 'checklists'
  | 'tasks'
  | 'activity'
  | 'templates'
  | 'filters'
  | 'backups'
  | 'meta';

let dbPromise: Promise<IDBDatabase> | null = null;

export function supportsIndexedDB(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!supportsIndexedDB()) {
      reject(new Error('IndexedDB is unavailable in this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const from = event.oldVersion;

      if (from < 1) {
        const checklists = db.createObjectStore('checklists', { keyPath: 'id' });
        checklists.createIndex('order', 'order');
        checklists.createIndex('archived', 'archived');
        checklists.createIndex('category', 'category');

        const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
        tasks.createIndex('checklistId', 'checklistId');
        tasks.createIndex('parentId', 'parentId');
        tasks.createIndex('dueDate', 'dueDate');
        tasks.createIndex('status', 'status');

        const activity = db.createObjectStore('activity', { keyPath: 'id' });
        activity.createIndex('ts', 'ts');

        db.createObjectStore('templates', { keyPath: 'id' });
        db.createObjectStore('filters', { keyPath: 'id' });

        const backups = db.createObjectStore('backups', { keyPath: 'id' });
        backups.createIndex('createdAt', 'createdAt');

        db.createObjectStore('meta', { keyPath: 'key' });
      }
      // Future migrations: `if (from < 2) { ... }`
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database upgrade blocked by another tab'));
  });
  return dbPromise;
}

function run<T>(
  store: StoreName | StoreName[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        let result: T;
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
        Promise.resolve(work(tx))
          .then((value) => {
            result = value;
          })
          .catch((error) => {
            try {
              tx.abort();
            } catch {
              /* already aborted */
            }
            reject(error);
          });
      }),
  );
}

function wrap<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getAll<T>(store: StoreName): Promise<T[]> {
  return run(store, 'readonly', (tx) => wrap<T[]>(tx.objectStore(store).getAll()));
}

export function get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return run(store, 'readonly', (tx) => wrap<T | undefined>(tx.objectStore(store).get(key)));
}

export function put<T>(store: StoreName, value: T): Promise<void> {
  return run(store, 'readwrite', async (tx) => {
    await wrap(tx.objectStore(store).put(value as unknown as any));
  });
}

export function putMany<T>(store: StoreName, values: T[]): Promise<void> {
  if (!values.length) return Promise.resolve();
  return run(store, 'readwrite', async (tx) => {
    const os = tx.objectStore(store);
    await Promise.all(values.map((value) => wrap(os.put(value as unknown as any))));
  });
}

export function remove(store: StoreName, key: IDBValidKey): Promise<void> {
  return run(store, 'readwrite', async (tx) => {
    await wrap(tx.objectStore(store).delete(key));
  });
}

export function removeMany(store: StoreName, keys: IDBValidKey[]): Promise<void> {
  if (!keys.length) return Promise.resolve();
  return run(store, 'readwrite', async (tx) => {
    const os = tx.objectStore(store);
    await Promise.all(keys.map((key) => wrap(os.delete(key))));
  });
}

export function clearStore(store: StoreName): Promise<void> {
  return run(store, 'readwrite', async (tx) => {
    await wrap(tx.objectStore(store).clear());
  });
}

export function countStore(store: StoreName): Promise<number> {
  return run(store, 'readonly', (tx) => wrap<number>(tx.objectStore(store).count()));
}

export function getMeta<T>(key: string): Promise<T | undefined> {
  return get<{ key: string; value: T }>('meta', key).then((row) => row?.value);
}

export function setMeta<T>(key: string, value: T): Promise<void> {
  return put('meta', { key, value });
}

/** Replaces the contents of the data stores in a single transaction (restore / import). */
export function replaceAll(payload: {
  checklists: unknown[];
  tasks: unknown[];
  templates: unknown[];
  filters: unknown[];
  activity: unknown[];
}): Promise<void> {
  return run(
    ['checklists', 'tasks', 'templates', 'filters', 'activity'],
    'readwrite',
    async (tx) => {
      const pairs: [StoreName, unknown[]][] = [
        ['checklists', payload.checklists],
        ['tasks', payload.tasks],
        ['templates', payload.templates],
        ['filters', payload.filters],
        ['activity', payload.activity],
      ];
      for (const [name, rows] of pairs) {
        const os = tx.objectStore(name);
        await wrap(os.clear());
        await Promise.all(rows.map((row) => wrap(os.put(row as any))));
      }
    },
  );
}

export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}

/** Ask the browser not to evict the database under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
