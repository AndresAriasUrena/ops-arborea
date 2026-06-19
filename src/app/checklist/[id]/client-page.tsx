'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CHECKLISTS } from '@/checklists';
import ChecklistForm from '@/components/ChecklistForm';
import type { ChecklistSchema } from '@/config';

export default function ChecklistClientPage() {
  const params = useParams();
  const router = useRouter();
  const [checklist, setChecklist] = useState<ChecklistSchema | null>(null);
  const [casa, setCasa] = useState<string>('');
  const [responsable, setResponsable] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener datos de localStorage
    const storedCasa = localStorage.getItem('arborea_casa');
    const storedResponsable = localStorage.getItem('arborea_responsable');

    if (!storedCasa || !storedResponsable) {
      // Si no hay datos, redirigir al inicio
      router.push('/');
      return;
    }

    // Buscar el checklist por ID
    const checklistId = params.id as string;
    const foundChecklist = CHECKLISTS.find((c) => c.id === checklistId);

    if (!foundChecklist) {
      // Si no existe el checklist, redirigir al inicio
      router.push('/');
      return;
    }

    setChecklist(foundChecklist);
    setCasa(storedCasa);
    setResponsable(storedResponsable);
    setLoading(false);
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Cargando checklist...</p>
      </div>
    );
  }

  if (!checklist) {
    return null; // Router redirige
  }

  return (
    <div className="container">
      <ChecklistForm schema={checklist} casa={casa} responsable={responsable} />
    </div>
  );
}
