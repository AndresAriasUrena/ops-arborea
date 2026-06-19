'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ChecklistSchema, Submission } from '@/config';
import { compressPhotos } from '@/lib/photo-compression';
import { saveSubmission, getPendingCount } from '@/lib/offline-storage';
import { syncSubmission } from '@/lib/sync';

interface ChecklistFormProps {
  schema: ChecklistSchema;
  casa: string;
  responsable: string;
}

export default function ChecklistForm({ schema, casa, responsable }: ChecklistFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnswerChange = (itemId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      const maxPhotos = schema.photos?.max || 10;
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, maxPhotos));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): string | null => {
    // Validar campos requeridos
    for (const section of schema.sections) {
      for (const item of section.items) {
        if (item.required && !answers[item.id]) {
          return `Campo requerido: ${item.label}`;
        }
      }
    }

    // Validar fotos requeridas
    if (schema.photos?.required && photos.length === 0) {
      return 'Se requiere al menos una foto';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setMessage('Guardando...');

    try {
      // Comprimir fotos
      const compressedPhotos = await compressPhotos(photos, schema.photos?.max || 10);

      // Crear submission
      const submission: Submission = {
        submissionId: crypto.randomUUID(),
        casa,
        checklistId: schema.id,
        checklistLabel: schema.label,
        responsable,
        deviceTimestamp: new Date().toISOString(),
        answers,
        notes: notes || undefined,
        photos: compressedPhotos,
        status: 'pending',
      };

      // Guardar en IndexedDB
      await saveSubmission(submission);

      // Intentar sincronizar inmediatamente si hay conexión
      if (navigator.onLine) {
        setMessage('Sincronizando...');
        const result = await syncSubmission(submission);
        if (result.ok) {
          setMessage('Checklist enviado correctamente');
          setTimeout(() => router.push('/'), 1500);
          return;
        }
      }

      // Si no hay conexión o falló, informar que se guardó offline
      const pendingCount = await getPendingCount();
      setMessage(`Guardado offline (${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''})`);
      setTimeout(() => router.push('/'), 2000);
    } catch (error) {
      console.error('Error al guardar:', error);
      setMessage('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checklist-form">
      <div className="form-header">
        <h2>{schema.label}</h2>
        <p className="meta">
          {casa} · {responsable}
        </p>
      </div>

      {schema.sections.map((section) => (
        <section key={section.title} className="form-section">
          <h3>{section.title}</h3>
          {section.items.map((item) => (
            <div key={item.id} className={`form-item ${item.type === 'check' ? 'checkbox-item' : ''}`}>
              {item.type === 'check' ? (
                <label>
                  <input
                    type="checkbox"
                    checked={!!answers[item.id]}
                    onChange={(e) => handleAnswerChange(item.id, e.target.checked)}
                  />
                  <span>
                    {item.label}
                    {item.required && <span className="required">*</span>}
                  </span>
                </label>
              ) : (
                <>
                  <label>
                    {item.label}
                    {item.required && <span className="required">*</span>}
                  </label>

                  {item.type === 'number' && (
                    <input
                      type="number"
                      min="0"
                      value={(answers[item.id] as number) || 0}
                      onChange={(e) => handleAnswerChange(item.id, parseInt(e.target.value) || 0)}
                    />
                  )}

                  {item.type === 'choice' && (
                    <select
                      value={(answers[item.id] as string) || ''}
                      onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                      required={item.required}
                    >
                      <option value="">Seleccionar...</option>
                      {item.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {item.type === 'text' && (
                    <textarea
                      rows={3}
                      value={(answers[item.id] as string) || ''}
                      onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                      required={item.required}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </section>
      ))}

      {schema.notes && (
        <section className="form-section">
          <h3>Notas adicionales</h3>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agrega notas o comentarios..."
          />
        </section>
      )}

      {schema.photos && (
        <section className="form-section">
          <h3>
            Fotos
            {schema.photos.required && <span className="required">*</span>}
          </h3>
          <p className="meta">Máximo {schema.photos.max} fotos</p>

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
            disabled={photos.length >= (schema.photos.max || 10)}
          >
            <span className="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </span>
            <span className="ttl">Tomar foto ({photos.length}/{schema.photos.max})</span>
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
      )}

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button type="submit" className="btn primary" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Enviar checklist'}
        </button>
      </div>
    </form>
  );
}
