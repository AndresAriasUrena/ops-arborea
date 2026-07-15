export type Role = 'limpieza' | 'mant' | 'gerencia';

export interface Person {
  id: string;
  name: string;
  role: Role;
  sub: string;
  surface?: 'field' | 'gerencia';
}

export interface House {
  id: string;
  name: string;
}

// Tipos para el sistema de checklists offline-first
export interface ChecklistItem {
  id: string;
  label: string;
  type: 'check' | 'number' | 'choice' | 'text';
  options?: string[];
  required?: boolean;
}

export interface ChecklistSchema {
  id: string;
  role: Role;
  label: string;
  icon: string;
  sections: { title: string; items: ChecklistItem[] }[];
  notes?: boolean;
  photos?: { max: number; required?: boolean };
}

export interface Submission {
  submissionId: string;       // uuid v4
  casa: string;
  checklistId: string;
  checklistLabel: string;
  responsable: string;
  deviceTimestamp: string;    // ISO
  answers: Record<string, unknown>;
  notes?: string;
  photos: { name: string; mime: string; dataBase64: string }[];
  status: 'pending' | 'synced';
}

// Tipos para el sistema de tareas extra
export interface Tarea {
  taskId: string;
  responsable: string;
  casa: string;
  titulo: string;
  descripcion: string;
  prioridad: 'normal' | 'urgente';
  semana: string;
  estado: string;
}

export interface TareaCompletada {
  tipo: 'tarea_completada';
  submissionId: string;        // uuid v4
  taskId: string;
  responsable: string;
  observaciones?: string;
  photos: { name: string; mime: string; dataBase64: string }[];
  deviceTimestamp: string;     // ISO
  status: 'pending' | 'synced';
  scope?: 'management';
}

export const people: Person[] = [
  {
    id: 'nicole',
    name: 'Nicole',
    role: 'limpieza',
    sub: 'limpieza',
  },
  {
    id: 'denisa',
    name: 'Denisa',
    role: 'limpieza',
    sub: 'limpieza',
  },
  {
    id: 'bryan',
    name: 'Bryan',
    role: 'mant',
    sub: 'mantenimiento',
  },
  {
    id: 'alex',
    name: 'Alex',
    role: 'gerencia',
    sub: 'gerencia',
    surface: 'gerencia',
  },
];

export const houses: House[] = [
  { id: 'ceiba', name: 'Ceiba' },
  { id: 'ronron', name: 'Ron Ron' },
  { id: 'mango', name: 'Mango' },
  { id: 'palmera', name: 'Palmera Azul' },
];

// Tipo para reporte de gasto/factura
export interface GastoPayload {
  action: 'guardarGasto';
  submissionId: string;
  responsable: string;
  casa: string;
  detalle: string;
  monto: string;
  deviceTimestamp: string;
  photos: { mime: string; dataBase64: string }[];
  status: 'pending' | 'synced';
}

// Backend configuration
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
export const SHARED_SECRET = process.env.NEXT_PUBLIC_SHARED_SECRET || '';
