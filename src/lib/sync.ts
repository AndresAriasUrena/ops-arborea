// Sincronización con backend Apps Script

import type { Submission, TareaCompletada } from '@/config';
import { BACKEND_URL, SHARED_SECRET } from '@/config';
import { getPendingSubmissions, markAsSynced } from './offline-storage';

export interface SyncResponse {
  ok: boolean;
  submissionId?: string;
  folderUrl?: string;
  error?: string;
  dedup?: boolean;
}

// Guard de concurrencia: solo una sincronización a la vez
let isSyncing = false;

// Type guard para TareaCompletada
function isTareaCompletada(item: Submission | TareaCompletada): item is TareaCompletada {
  return 'tipo' in item && item.tipo === 'tarea_completada';
}

export async function syncSubmission(submission: Submission | TareaCompletada): Promise<SyncResponse> {
  if (!BACKEND_URL) {
    return {
      ok: false,
      error: 'BACKEND_URL no configurado - revisar .env.local'
    };
  }

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain', // Evita preflight CORS
      },
      body: JSON.stringify({
        ...submission,
        secret: SHARED_SECRET,
      }),
    });

    // Nota: ContentService siempre responde 200, el status HTTP no es confiable
    // La decisión real está en body.ok

    let result: SyncResponse;
    try {
      result = await response.json();
    } catch (parseError) {
      // Si el body no es JSON (ej: HTML de error), tratarlo como fallo
      console.error('Error parseando respuesta JSON:', parseError);
      return {
        ok: false,
        error: `Respuesta inválida del servidor (HTTP ${response.status})`,
      };
    }

    // La verdad está en result.ok, no en response.ok
    return result;

  } catch (error) {
    console.error('Error al sincronizar:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export async function syncAllPending(): Promise<{ synced: number; failed: number }> {
  // Guard de concurrencia: no correr múltiples syncs en paralelo
  if (isSyncing) {
    console.log('Sync ya en progreso, saltando...');
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  try {
    const pending = await getPendingSubmissions();
    let synced = 0;
    let failed = 0;

    for (const submission of pending) {
      const result = await syncSubmission(submission);
      // Solo marcar como synced si result.ok es true (no depender de HTTP status)
      if (result.ok) {
        await markAsSynced(submission.submissionId);
        synced++;
      } else {
        failed++;
        console.warn(`Fallo al sincronizar ${submission.submissionId}:`, result.error);
      }
    }

    return { synced, failed };
  } finally {
    isSyncing = false;
  }
}

// Intentar sincronizar al abrir la app o cuando vuelva la conexión
export function initAutoSync() {
  if (typeof window === 'undefined') return;

  // Sync al cargar la página
  if (navigator.onLine) {
    syncAllPending().catch(console.error);
  }

  // Sync cuando vuelva la conexión
  window.addEventListener('online', () => {
    syncAllPending().catch(console.error);
  });

  // Escuchar mensajes del Service Worker (Background Sync)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'BACKGROUND_SYNC' && event.data.tag === 'sync-submissions') {
        syncAllPending().catch(console.error);
      }
    });

    // Registrar Background Sync si está disponible
    if ('sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // @ts-ignore - Background Sync API no está en tipos estándar
        return registration.sync.register('sync-submissions');
      }).catch(console.error);
    }
  }
}
