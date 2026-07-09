// Manejo de tareas extra: lectura con caché y cierre con cola offline

import type { Tarea, TareaCompletada } from '@/config';
import { BACKEND_URL, SHARED_SECRET } from '@/config';
import { initDB } from './offline-storage';

const TAREAS_STORE = 'tareasCache';

// Guardar tareas en caché
async function saveTareasToCache(responsable: string, tareas: Tarea[]): Promise<void> {
  const db = await initDB();

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

// Función interna compartida para fetch + caché
async function fetchTareasInternal(responsable: string, action: 'getTareas' | 'getTareasManagement'): Promise<Tarea[]> {
  if (!BACKEND_URL) {
    console.warn(`[${action}] BACKEND_URL no configurado, usando caché`);
    const cached = await getTareasFromCache(responsable);
    return cached || [];
  }

  if (navigator.onLine) {
    try {
      const payload = { action, responsable, secret: SHARED_SECRET };
      console.log(`[${action}] Enviando request:`, { action, responsable });

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });

      console.log(`[${action}] Response status:`, response.status);
      const result: { ok: boolean; tareas?: Tarea[]; error?: string } = await response.json();
      console.log(`[${action}] Response body:`, result);

      if (result.ok && result.tareas) {
        await saveTareasToCache(responsable, result.tareas);
        return result.tareas;
      } else {
        console.warn(`[${action}] Backend error:`, result.error);
        const cached = await getTareasFromCache(responsable);
        if (cached && cached.length > 0) {
          console.log(`[${action}] Usando caché existente:`, cached.length, 'tareas');
          return cached;
        }
        console.log(`[${action}] No hay caché disponible, devolviendo array vacío`);
        return [];
      }
    } catch (error) {
      console.error(`[${action}] Error de red:`, error);
      const cached = await getTareasFromCache(responsable);
      return cached || [];
    }
  }

  const cached = await getTareasFromCache(responsable);
  return cached || [];
}

// Fetch tareas de campo desde el backend con caché offline
export async function fetchTareas(responsable: string): Promise<Tarea[]> {
  return fetchTareasInternal(responsable, 'getTareas');
}

// Fetch tareas de gerencia (hoja Management) con caché offline
export async function fetchTareasManagement(responsable: string): Promise<Tarea[]> {
  return fetchTareasInternal(responsable, 'getTareasManagement');
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

// Función de desarrollo: insertar tareas de prueba en caché
// Solo para testing mientras el backend implementa getTareas
export async function seedTareasForTesting(responsable: string): Promise<void> {
  const tareasDemo: Tarea[] = [
    {
      taskId: 'tarea-001',
      responsable,
      casa: 'Ceiba',
      titulo: 'Revisar sistema de agua caliente',
      descripcion: 'El huésped reportó que el agua caliente tarda mucho en llegar. Verificar calentador y tuberías.',
      prioridad: 'urgente',
      semana: '2026-W28',
      estado: 'pendiente'
    },
    {
      taskId: 'tarea-002',
      responsable,
      casa: 'Mango',
      titulo: 'Cambiar filtro de piscina',
      descripcion: 'Mantenimiento preventivo programado para el filtro de la piscina.',
      prioridad: 'normal',
      semana: '2026-W28',
      estado: 'pendiente'
    },
    {
      taskId: 'tarea-003',
      responsable,
      casa: 'Palmera Azul',
      titulo: 'Reparar cerradura de puerta principal',
      descripcion: 'La cerradura está atascada y cuesta trabajo abrir. Requiere lubricación o reemplazo.',
      prioridad: 'urgente',
      semana: '2026-W28',
      estado: 'pendiente'
    },
    {
      taskId: 'tarea-004',
      responsable,
      casa: 'Ron Ron',
      titulo: 'Podar árboles del jardín',
      descripcion: 'Las ramas están tocando el techo y las ventanas. Podar para mantener distancia segura.',
      prioridad: 'normal',
      semana: '2026-W28',
      estado: 'pendiente'
    }
  ];

  await saveTareasToCache(responsable, tareasDemo);
  console.log('[seedTareasForTesting] Insertadas', tareasDemo.length, 'tareas de prueba para', responsable);
}
