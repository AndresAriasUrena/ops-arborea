'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import type { Tarea, TareaCompletada } from '@/config';
import { compressPhotos } from '@/lib/photo-compression';
import { saveSubmission, getPendingCount } from '@/lib/offline-storage';
import { syncSubmission } from '@/lib/sync';
import { TaskIcon } from '@/lib/icons';

export default function TareaDetailClientPage() {
  const router = useRouter();
  const params = useParams();
  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cargar tarea desde localStorage
    const tareaJson = localStorage.getItem('arborea_tarea_actual');
    if (!tareaJson) {
      router.push('/tareas');
      return;
    }

    const loadedTarea = JSON.parse(tareaJson) as Tarea;

    // Verificar que el ID coincide
    if (loadedTarea.taskId !== params.id) {
      router.push('/tareas');
      return;
    }

    setTarea(loadedTarea);
  }, [params.id, router]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tarea) return;

    setIsSubmitting(true);
    setMessage('Guardando...');

    try {
      // Comprimir fotos
      const compressedPhotos = await compressPhotos(photos, 5);

      // Crear submission de tarea completada
      const tareaCompletada: TareaCompletada = {
        tipo: 'tarea_completada',
        submissionId: crypto.randomUUID(),
        taskId: tarea.taskId,
        responsable: tarea.responsable,
        observaciones: observaciones || undefined,
        photos: compressedPhotos,
        deviceTimestamp: new Date().toISOString(),
        status: 'pending',
      };

      // Guardar en IndexedDB (misma cola que submissions)
      await saveSubmission(tareaCompletada);

      // Intentar sincronizar inmediatamente si hay conexión
      if (navigator.onLine) {
        setMessage('Sincronizando...');
        const result = await syncSubmission(tareaCompletada);
        if (result.ok) {
          setMessage('Tarea completada correctamente');

          // Limpiar localStorage
          localStorage.removeItem('arborea_tarea_actual');

          setTimeout(() => router.push('/tareas'), 1500);
          return;
        }
      }

      // Si no hay conexión o falló, informar que se guardó offline
      const pendingCount = await getPendingCount();
      setMessage(`Guardado offline (${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''})`);

      // Limpiar localStorage
      localStorage.removeItem('arborea_tarea_actual');

      setTimeout(() => router.push('/tareas'), 2000);
    } catch (error) {
      console.error('Error al guardar:', error);
      setMessage('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tarea) {
    return (
      <div className="wrap">
        <main style={{ padding: '40px', textAlign: 'center', color: 'var(--sand)' }}>
          Cargando...
        </main>
      </div>
    );
  }

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
          <button onClick={() => router.push('/')}>{tarea.responsable}</button>
          <span className="sep">→</span>
          <button onClick={() => router.push('/tareas')}>Mis pendientes</button>
        </div>
      </header>

      <main>
        <form onSubmit={handleSubmit} className="checklist-form">
          <div className="form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ color: 'var(--amber)' }}>
                <TaskIcon />
              </div>
              <h2>{tarea.titulo}</h2>
            </div>
            <p className="meta">
              {tarea.casa}
              {tarea.prioridad === 'urgente' && (
                <>
                  {' · '}
                  <span style={{ color: 'var(--amber)' }}>Urgente</span>
                </>
              )}
            </p>
          </div>

          {tarea.descripcion && (
            <section className="form-section">
              <h3>Descripción</h3>
              <p style={{ color: 'var(--sand)', lineHeight: 1.6 }}>
                {tarea.descripcion}
              </p>
            </section>
          )}

          <section className="form-section">
            <h3>Observaciones</h3>
            <textarea
              rows={4}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Agrega observaciones sobre la tarea completada..."
            />
          </section>

          <section className="form-section">
            <h3>Fotos</h3>
            <p className="meta">Máximo 5 fotos (opcional)</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />

            <button
              type="button"
              className="btn photo-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= 5}
            >
              <span className="ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </span>
              <span className="ttl">Tomar foto ({photos.length}/5)</span>
            </button>

            {photos.length > 0 && (
              <div className="photo-grid">
                {photos.map((photo, index) => (
                  <div key={index} className="photo-preview">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Foto ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="remove-photo"
                      onClick={() => removePhoto(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {message && (
            <div className="message" style={{
              padding: '16px',
              background: 'var(--canopy)',
              color: 'var(--paper)',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {message}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => router.push('/tareas')}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Marcar como completada'}
            </button>
          </div>
        </form>

        <footer>donde el bosque respira</footer>
      </main>
    </div>
  );
}
