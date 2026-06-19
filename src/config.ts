export type Role = 'limpieza' | 'mant';

export interface Person {
  id: string;
  name: string;
  role: Role;
  sub: string;
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
    id: 'andres',
    name: 'Andrés',
    role: 'mant',
    sub: 'mantenimiento',
  },
  {
    id: 'brian',
    name: 'Brian',
    role: 'mant',
    sub: 'mantenimiento',
  },
];

export const houses: House[] = [
  { id: 'nube', name: 'Casa Nube' },
  { id: 'mango', name: 'Casa Mango' },
  { id: 'palmera', name: 'Palmera Azul' },
  { id: 'castana', name: 'Casa Castaña' },
];

// Backend configuration
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
export const SHARED_SECRET = process.env.NEXT_PUBLIC_SHARED_SECRET || '';
