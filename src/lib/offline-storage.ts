// Manejo de IndexedDB para cola de submissions pendientes

import type { Submission, TareaCompletada } from '@/config';

const DB_NAME = 'arborea-ops';
const DB_VERSION = 1;
const STORE_NAME = 'submissions';

let db: IDBDatabase | null = null;

// Type union para items en la cola
export type QueuedItem = Submission | TareaCompletada;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'submissionId' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('deviceTimestamp', 'deviceTimestamp', { unique: false });
      }
    };
  });
}

export async function saveSubmission(submission: QueuedItem): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(submission);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingSubmissions(): Promise<QueuedItem[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll('pending');

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllSubmissions(): Promise<QueuedItem[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function markAsSynced(submissionId: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(submissionId);

    getRequest.onsuccess = () => {
      const submission = getRequest.result;
      if (submission) {
        submission.status = 'synced';
        const putRequest = store.put(submission);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve(); // Ya no existe
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deleteSubmission(submissionId: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(submissionId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingSubmissions();
  return pending.length;
}
