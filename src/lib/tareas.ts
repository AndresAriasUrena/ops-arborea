// Manejo de tareas extra: lectura con caché y cierre con cola offline

import type { Tarea, TareaCompletada } from '@/config';
import { BACKEND_URL, SHARED_SECRET } from '@/config';
import { initDB } from './offline-storage';

const TAREAS_STORE = 'tareasCache';

// Inicializar store de caché de tareas (se añade al DB existente)
export async function initTareasCache(): Promise<void> {
  const db = await initDB();

  // Si ya existe el store, no hacer nada
  if (db.objectStoreNames.contains(TAREAS_STORE)) {
    return;
  }

  // Necesitamos cerrar la conexión y reabrir con nueva versión
  const currentVersion = db.version;
  db.close();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(db.name, currentVersion + 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(TAREAS_STORE)) {
        database.createObjectStore(TAREAS_STORE, { keyPath: 'responsable' });
      }
    };
  });
}

// Guardar tareas en caché
async function saveTareasToCache(responsable: string, tareas: Tarea[]): Promise<void> {
  const db = await initDB();

  // Asegurarse de que el store existe
  if (!db.objectStoreNames.contains(TAREAS_STORE)) {
    await initTareasCache();
    // Reconectar después de la migración
    const newDb = await initDB();
    return saveTareasToCacheInternal(newDb, responsable, tareas);
  }

  return saveTareasToCacheInternal(db, responsable, tareas);
}

function saveTareasToCacheInternal(
  db: IDBDatabase,
  responsable: string,
  tareas: Tarea[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAREAS_STORE], 'readwrite');
    const store = transaction.objectStore(TAREAS_STORE);
    const request = store.put({
      responsable,
      tareas,
      timestamp: new Date().toISOString(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Leer tareas desde caché
async function getTareasFromCache(responsable: string): Promise<Tarea[] | null> {
  const db = await initDB();

  if (!db.objectStoreNames.contains(TAREAS_STORE)) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAREAS_STORE], 'readonly');
    const store = transaction.objectStore(TAREAS_STORE);
    const request = store.get(responsable);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.tareas : null);
    };
    request.onerror = () => reject(request.error);
  });
}

// Fetch tareas desde el backend con caché offline
export async function fetchTareas(responsable: string): Promise<Tarea[]> {
  if (!BACKEND_URL) {
    console.warn('BACKEND_URL no configurado, usando caché');
    const cached = await getTareasFromCache(responsable);
    return cached || [];
  }

  // Intentar fetch online
  if (navigator.onLine) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'getTareas',
          responsable,
          secret: SHARED_SECRET,
        }),
      });

      const result: { ok: boolean; tareas?: Tarea[]; error?: string } = await response.json();

      if (result.ok && result.tareas) {
        // Guardar en caché
        await saveTareasToCache(responsable, result.tareas);
        return result.tareas;
      } else {
        console.error('Error al obtener tareas:', result.error);
        // Fallback a caché
        const cached = await getTareasFromCache(responsable);
        return cached || [];
      }
    } catch (error) {
      console.error('Error de red al obtener tareas:', error);
      // Fallback a caché
      const cached = await getTareasFromCache(responsable);
      return cached || [];
    }
  }

  // Sin conexión, usar caché
  const cached = await getTareasFromCache(responsable);
  return cached || [];
}

// Encolar cierre de tarea (usa la misma cola que submissions)
export async function enqueueTareaCompletada(tarea: TareaCompletada): Promise<void> {
  const db = await initDB();
  const STORE_NAME = 'submissions'; // Usa el mismo store que submissions

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    // El objeto tarea ya tiene tipo:'tarea_completada' y submissionId como key
    const request = store.put(tarea);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
