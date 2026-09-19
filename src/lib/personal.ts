// Personal de campo: fuente real es la hoja "Personal" (acción getPersonal).
// La caché en localStorage mantiene la app funcional offline; config.people es el
// fallback de primer arranque sin internet.

import type { Person } from '@/config';
import { people, BACKEND_URL, SHARED_SECRET } from '@/config';

const CACHE_KEY = 'arborea_personal_cache';

// Fallback: todo el personal de config excepto gerencia (Alex).
function fallbackFieldPeople(): Person[] {
  return people.filter(p => p.surface !== 'gerencia');
}

// Solo aceptamos entradas con name y un role de campo válido.
function isValidFieldPerson(p: Person): boolean {
  return Boolean(p && p.name) && (p.role === 'limpieza' || p.role === 'mant');
}

// Síncrona: lee la caché de localStorage. Si no hay caché válida (array no vacío),
// cae al fallback de config. Debe llamarse solo en cliente.
export function getCachedFieldPeople(): Person[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Person[];
      }
    }
  } catch {
    // localStorage inaccesible o JSON corrupto — usar fallback.
  }
  return fallbackFieldPeople();
}

// Refresca desde el backend. Devuelve la lista nueva o null si no se pudo/no aplica.
// Nunca sobrescribe la caché con una lista vacía. Debe llamarse solo en cliente.
export async function refreshFieldPeople(): Promise<Person[] | null> {
  if (!BACKEND_URL || !navigator.onLine) {
    return null;
  }

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'getPersonal', secret: SHARED_SECRET }),
    });

    const result: { ok?: boolean; personal?: Person[] } = await response.json();

    if (!result.ok || !Array.isArray(result.personal)) {
      return null;
    }

    const valid = result.personal.filter(isValidFieldPerson);
    // Una hoja vaciada por error no puede dejar la app sin personal.
    if (valid.length === 0) {
      return null;
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(valid));
    return valid;
  } catch {
    return null;
  }
}
