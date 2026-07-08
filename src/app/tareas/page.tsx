'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { fetchTareas } from '@/lib/tareas';
import type { Tarea } from '@/config';
import { TaskIcon } from '@/lib/icons';

export default function TareasPage() {
  const router = useRouter();
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [responsable, setResponsable] = useState<string>('');

  useEffect(() => {
    const loadTareas = async () => {
      const lastPerson = localStorage.getItem('arborea-last-person');
      const savedResponsable = localStorage.getItem('arborea_responsable');

      if (!savedResponsable) {
        router.push('/');
        return;
      }

      setResponsable(savedResponsable);

      try {
        const fetchedTareas = await fetchTareas(savedResponsable);

        // Ordenar: urgentes primero, luego normales
        const sorted = [...fetchedTareas].sort((a, b) => {
          if (a.prioridad === 'urgente' && b.prioridad !== 'urgente') return -1;
          if (a.prioridad !== 'urgente' && b.prioridad === 'urgente') return 1;
          return 0;
        });

        setTareas(sorted);
      } catch (error) {
        console.error('Error loading tareas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTareas();
  }, [router]);

  const handleTareaClick = (tarea: Tarea) => {
    // Guardar tarea seleccionada en localStorage para el detalle
    localStorage.setItem('arborea_tarea_actual', JSON.stringify(tarea));
    router.push(`/tareas/${tarea.taskId}`);
  };

  return (
    <div className="wrap">
      <header>
        <Image
          src="/sub-logo.png"
          alt="Arbórea Experiences"
          width={188}
          height={48}
          className="lockup"
          priority
        />
        <div className="trail">
          <button onClick={() => router.push('/')}>{responsable}</button>
          <span className="sep">→</span>
          <span>Mis pendientes</span>
        </div>
      </header>

      <main>
        <div className="view">
          <div className="step">Mis pendientes</div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sand)' }}>
              Cargando...
            </div>
          ) : tareas.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sand)' }}>
              No tienes tareas pendientes
            </div>
          ) : (
            <div className="grid">
              {tareas.map((tarea) => (
                <button
                  key={tarea.taskId}
                  className="btn"
                  onClick={() => handleTareaClick(tarea)}
                >
                  <div className="ico">
                    <TaskIcon />
                  </div>
                  <div className="body">
                    <div className="ttl">
                      {tarea.titulo}
                      {tarea.prioridad === 'urgente' && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '13px',
                          color: 'var(--amber)',
                          fontWeight: 'normal'
                        }}>
                          Urgente
                        </span>
                      )}
                    </div>
                    <div className="sub">{tarea.casa}</div>
                    {tarea.descripcion && (
                      <div className="role" style={{ marginTop: '6px', fontSize: '14px' }}>
                        {tarea.descripcion.substring(0, 80)}
                        {tarea.descripcion.length > 80 ? '...' : ''}
                      </div>
                    )}
                  </div>
                  <div className="go">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button className="back" onClick={() => router.push('/')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
            volver
          </button>
        </div>

        <footer>donde el bosque respira</footer>
      </main>
    </div>
  );
}
