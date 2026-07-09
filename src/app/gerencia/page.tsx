'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { fetchTareasManagement } from '@/lib/tareas';
import { TaskIcon } from '@/lib/icons';
import type { Tarea } from '@/config';

const GERENCIA_PIN = process.env.NEXT_PUBLIC_GERENCIA_PIN || '';

export default function GerenciaPage() {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (localStorage.getItem('arborea_gerencia_ok') === 'true') {
      localStorage.setItem('arborea_responsable', 'Alex');
      setUnlocked(true);
      loadTareas();
    } else {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, []);

  async function loadTareas() {
    setLoading(true);
    try {
      const fetched = await fetchTareasManagement('Alex');
      const sorted = [...fetched].sort((a, b) => {
        if (a.prioridad === 'urgente' && b.prioridad !== 'urgente') return -1;
        if (a.prioridad !== 'urgente' && b.prioridad === 'urgente') return 1;
        return 0;
      });
      setTareas(sorted);
    } catch {
      setTareas([]);
    } finally {
      setLoading(false);
    }
  }

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === GERENCIA_PIN) {
      localStorage.setItem('arborea_gerencia_ok', 'true');
      localStorage.setItem('arborea_responsable', 'Alex');
      setUnlocked(true);
      loadTareas();
    } else {
      setPinError(true);
      setPin('');
      setTimeout(() => setPinError(false), 1500);
      pinInputRef.current?.focus();
    }
  }

  function handleTareaClick(tarea: Tarea) {
    localStorage.setItem('arborea_tarea_actual', JSON.stringify({ ...tarea, _scope: 'management' }));
    localStorage.setItem('arborea_responsable', 'Alex');
    router.push('/tarea');
  }

  function handleSalir() {
    localStorage.removeItem('arborea_gerencia_ok');
    localStorage.removeItem('arborea_responsable');
    router.push('/');
  }

  if (!unlocked) {
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
        </header>

        <main>
          <div className="view" style={{ maxWidth: 320, margin: '0 auto' }}>
            <div className="step">Gerencia</div>

            <div style={{
              textAlign: 'center',
              marginBottom: 32,
              color: 'var(--sand)',
              fontFamily: 'var(--structural)',
              fontSize: 14,
              letterSpacing: '0.01em',
            }}>
              Ingresa tu PIN para acceder
            </div>

            <form onSubmit={handlePinSubmit}>
              <div className="form-section" style={{ marginBottom: 16 }}>
                <input
                  ref={pinInputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  style={{
                    width: '100%',
                    fontFamily: 'var(--quiet)',
                    fontSize: 24,
                    letterSpacing: '0.4em',
                    textAlign: 'center',
                    color: pinError ? '#FF8A80' : 'var(--paper)',
                    background: 'var(--forest)',
                    border: `1px solid ${pinError ? '#FF8A80' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  autoComplete="off"
                />
                {pinError && (
                  <div style={{
                    textAlign: 'center',
                    marginTop: 8,
                    color: '#FF8A80',
                    fontFamily: 'var(--structural)',
                    fontSize: 13,
                  }}>
                    PIN incorrecto
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn primary"
                disabled={pin.length < 4}
                style={{ justifyContent: 'center' }}
              >
                <span className="ttl">Entrar</span>
              </button>
            </form>
          </div>
        </main>

        <footer style={{ textAlign: 'center', marginTop: 'auto' }}>donde el bosque respira</footer>
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
          <span style={{ color: 'var(--sand)', fontFamily: 'var(--structural)', fontSize: 13 }}>Alex</span>
        </div>
      </header>

      <main>
        <div className="view">
          <div className="step">Pendientes</div>

          {loading && (
            <div style={{
              color: 'var(--slate)',
              fontFamily: 'var(--structural)',
              fontSize: 14,
              textAlign: 'center',
              padding: '24px 0',
            }}>
              Cargando...
            </div>
          )}

          {!loading && tareas.length === 0 && (
            <div style={{
              color: 'var(--slate)',
              fontFamily: 'var(--structural)',
              fontSize: 14,
              textAlign: 'center',
              padding: '32px 0',
              lineHeight: 1.6,
            }}>
              Sin pendientes por ahora.
            </div>
          )}

          {!loading && tareas.length > 0 && (
            <div className="grid">
              {tareas.map((tarea) => (
                <button
                  key={tarea.taskId}
                  className="btn"
                  onClick={() => handleTareaClick(tarea)}
                >
                  <div className="ico" style={{ color: tarea.prioridad === 'urgente' ? 'var(--amber)' : 'var(--slate)' }}>
                    <TaskIcon />
                  </div>
                  <div className="body">
                    <div className="ttl">
                      {tarea.titulo}
                      {tarea.prioridad === 'urgente' && (
                        <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--amber)', fontWeight: 'normal' }}>
                          Urgente
                        </span>
                      )}
                    </div>
                    {tarea.casa && <div className="sub">{tarea.casa}</div>}
                    {tarea.descripcion && (
                      <div className="role" style={{ marginTop: 4, fontSize: 13 }}>
                        {tarea.descripcion.substring(0, 80)}{tarea.descripcion.length > 80 ? '...' : ''}
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
        </div>
      </main>

      <div style={{ marginTop: 'auto', paddingTop: 24, textAlign: 'center' }}>
        <button
          onClick={handleSalir}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--dusk)',
            fontFamily: 'var(--structural)',
            fontSize: 13,
            cursor: 'pointer',
            letterSpacing: '0.02em',
            padding: '8px 16px',
          }}
        >
          Salir de gerencia
        </button>
      </div>

      <footer>donde el bosque respira</footer>
    </div>
  );
}
