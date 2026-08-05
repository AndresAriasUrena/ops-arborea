// Inventario de bodega: búsqueda con caché offline + retiro/ingreso (siempre en línea)

import type { InventarioItem, RetiroPayload, IngresoPayload } from '@/config';
import { BACKEND_URL, SHARED_SECRET } from '@/config';
import { initDB } from './offline-storage';

const INVENTARIO_STORE = 'inventarioCache';
const CACHE_KEY = 'all';

// Guardar el catálogo completo en caché
async function saveInventarioToCache(items: InventarioItem[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([INVENTARIO_STORE], 'readwrite');
    const store = transaction.objectStore(INVENTARIO_STORE);
    const request = store.put({ id: CACHE_KEY, items, timestamp: new Date().toISOString() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Leer el catálogo desde caché
async function getInventarioFromCache(): Promise<InventarioItem[] | null> {
  const db = await initDB();

  if (!db.objectStoreNames.contains(INVENTARIO_STORE)) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([INVENTARIO_STORE], 'readonly');
    const store = transaction.objectStore(INVENTARIO_STORE);
    const request = store.get(CACHE_KEY);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.items : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export interface InventarioResult {
  ok: boolean;
  items: InventarioItem[];
  error?: string;
  fromCache?: boolean;
}

// Fetch del catálogo completo desde el backend, con caché offline como respaldo
export async function fetchInventario(): Promise<InventarioResult> {
  if (!BACKEND_URL) {
    console.warn('[getInventario] BACKEND_URL no configurado, usando caché');
    const cached = await getInventarioFromCache();
    return { ok: true, items: cached || [], fromCache: true };
  }

  if (navigator.onLine) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'getInventario', secret: SHARED_SECRET }),
      });

      const result: { ok: boolean; items?: InventarioItem[]; error?: string } = await response.json();

      if (result.ok && result.items) {
        await saveInventarioToCache(result.items);
        return { ok: true, items: result.items };
      } else {
        const cached = await getInventarioFromCache();
        if (cached && cached.length > 0) {
          return { ok: true, items: cached, fromCache: true };
        }
        return { ok: false, items: [], error: result.error || 'Error del servidor' };
      }
    } catch (error) {
      console.error('[getInventario] Error de red:', error);
      const cached = await getInventarioFromCache();
      if (cached && cached.length > 0) {
        return { ok: true, items: cached, fromCache: true };
      }
      return { ok: false, items: [], error: 'Sin conexión y sin datos guardados' };
    }
  }

  // Sin conexión — usar caché si existe
  const cached = await getInventarioFromCache();
  if (cached) {
    return { ok: true, items: cached, fromCache: true };
  }
  return { ok: false, items: [], error: 'Sin conexión' };
}

export interface RetiroResult {
  ok: boolean;
  error?: string;
  articulo?: string;
  cantidadRetirada?: number;
  cantidadDisponible?: number;
  dedup?: boolean;
}

// Retira un artículo. SIEMPRE en línea: el backend resta contra el stock real bajo lock,
// para que dos retiros simultáneos del mismo artículo nunca se pisen ni dejen el conteo mal.
export async function retirarArticulo(payload: RetiroPayload): Promise<RetiroResult> {
  if (!navigator.onLine) {
    return { ok: false, error: 'Sin conexión — conectate para retirar artículos' };
  }
  if (!BACKEND_URL) {
    return { ok: false, error: 'BACKEND_URL no configurado' };
  }

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ ...payload, secret: SHARED_SECRET }),
    });

    const result: RetiroResult = await response.json();

    // Si salió bien, refrescar la caché local con la cantidad nueva (búsquedas siguientes al día)
    if (result.ok && typeof result.cantidadDisponible === 'number') {
      const cached = await getInventarioFromCache();
      if (cached) {
        const updated = cached.map(item =>
          item.itemId === payload.itemId ? { ...item, cantidad: result.cantidadDisponible as number } : item
        );
        await saveInventarioToCache(updated);
      }
    }

    return result;
  } catch (error) {
    console.error('[retirarInventario] Error de red:', error);
    return { ok: false, error: 'Error de red al retirar' };
  }
}

export interface IngresoResult {
  ok: boolean;
  error?: string;
  itemId?: string;
  caja?: string;
  categoria?: string;
  articulo?: string;
  cantidadIngresada?: number;
  cantidadDisponible?: number;
  nuevo?: boolean;
  dedup?: boolean;
}

// Agrega stock. SIEMPRE en línea, igual que retirarArticulo. Con payload.itemId reabastece un
// artículo existente; sin itemId da de alta uno nuevo (requiere caja/categoria/articulo).
export async function ingresarArticulo(payload: IngresoPayload): Promise<IngresoResult> {
  if (!navigator.onLine) {
    return { ok: false, error: 'Sin conexión — conectate para agregar artículos' };
  }
  if (!BACKEND_URL) {
    return { ok: false, error: 'BACKEND_URL no configurado' };
  }

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ ...payload, secret: SHARED_SECRET }),
    });

    const result: IngresoResult = await response.json();

    if (result.ok && typeof result.cantidadDisponible === 'number' && result.itemId) {
      const cached = await getInventarioFromCache();
      if (cached) {
        const idx = cached.findIndex(item => item.itemId === result.itemId);
        if (idx >= 0) {
          const updated = [...cached];
          updated[idx] = { ...updated[idx], cantidad: result.cantidadDisponible as number };
          await saveInventarioToCache(updated);
        } else {
          // Artículo nuevo: lo sumamos a la caché local para que aparezca en la próxima búsqueda.
          await saveInventarioToCache([...cached, {
            itemId: result.itemId,
            caja: result.caja || payload.caja || '',
            categoria: result.categoria || payload.categoria || '',
            articulo: result.articulo || payload.articulo || '',
            cantidad: result.cantidadDisponible as number,
            notas: payload.nota || '',
          }]);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('[ingresarInventario] Error de red:', error);
    return { ok: false, error: 'Error de red al agregar' };
  }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // quita acentos para que "grifería" == "griferia"
}

// Búsqueda local por artículo, categoría o caja (sin distinguir mayúsculas ni acentos)
export function filterInventario(items: InventarioItem[], query: string): InventarioItem[] {
  const q = normalize(query.trim());
  if (!q) return items;
  return items.filter(item =>
    normalize(item.articulo).includes(q) ||
    normalize(item.categoria).includes(q) ||
    normalize(item.caja).includes(q)
  );
}
