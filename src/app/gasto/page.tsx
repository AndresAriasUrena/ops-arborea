'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { GastoPayload } from '@/config';
import { compressPhotosGasto } from '@/lib/photo-compression';
import { saveSubmission } from '@/lib/offline-storage';
import { syncAllPending } from '@/lib/sync';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

type PhotoPreview = {
  dataUrl: string;
  mime: string;
  dataBase64: string;
};

export default function GastoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [responsable, setResponsable] = useState('');
  const [isGerencia, setIsGerencia] = useState(false);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [detalle, setDetalle] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [sending, setSending] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('arborea_responsable');
    if (!saved) {
      router.push('/');
      return;
    }
    setResponsable(saved);
    setIsGerencia(localStorage.getItem('arborea_gerencia_ok') === 'true');
  }, [router]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setCompressing(true);
    try {
      const compressed = await compressPhotosGasto(files);
      const previews: PhotoPreview[] = compressed.map((c, i) => ({
        dataUrl: `data:${c.mime};base64,${c.dataBase64}`,
        mime: c.mime,
        dataBase64: c.dataBase64,
      }));
      setPhotos(prev => [...prev, ...previews].slice(0, 10));
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length === 0 || sending) return;

    setSending(true);
    try {
      const gasto: GastoPayload = {
        action: 'guardarGasto',
        submissionId: generateUUID(),
        responsable,
        casa: '',
        detalle: `${metodoPago ? `[${metodoPago}] ` : ''}${detalle}`.trim(),
        monto,
        deviceTimestamp: new Date().toISOString(),
        photos: photos.map(p => ({ mime: p.mime, dataBase64: p.dataBase64 })),
        status: 'pending',
      };

      await saveSubmission(gasto);
      syncAllPending().catch(console.error);

      setDone(true);
      setTimeout(() => {
        if (isGerencia) {
          router.push('/gerencia');
        } else {
          router.push('/');
        }
      }, 1200);
    } catch (err) {
      console.error('Error al guardar gasto:', err);
      setSending(false);
    }
  }

  if (!responsable) return null;

  return (
    <div className="wrap">
      <header>
        <Image src="/sub-logo.png" alt="Arbórea Experiences" width={188} height={48} className="lockup" priority />
        <div className="trail">
          <button
            onClick={() => router.push(isGerencia ? '/gerencia' : '/')}
            style={{ background: 'none', border: 'none', color: 'var(--sand)', fontFamily: 'var(--structural)', fontSize: 13, cursor: 'pointer', padding: 0 }}
          >
            {isGerencia ? 'Gerencia' : responsable}
          </button>
          <span className="sep">→</span>
        </div>
      </header>

      <main>
        <div className="view" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="step">Reportar factura</div>

          {done ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--slate)', fontFamily: 'var(--structural)', fontSize: 14 }}>
              Factura registrada
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Fotos */}
              <div className="form-section" style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontFamily: 'var(--structural)', fontSize: 13, color: 'var(--sand)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Fotos de la factura
                </label>

                {photos.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    {photos.map((p, i) => (
                      <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.dataUrl}
                          alt={`Foto ${i + 1}`}
                          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          style={{
                            position: 'absolute', top: -6, right: -6,
                            width: 20, height: 20, borderRadius: '50%',
                            background: 'var(--forest)', border: '1px solid var(--border)',
                            color: 'var(--paper)', fontSize: 11, lineHeight: 1,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          aria-label="Quitar foto"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={compressing || photos.length >= 10}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'var(--forest)',
                    border: '1px dashed var(--border)',
                    borderRadius: 8,
                    color: compressing ? 'var(--dusk)' : 'var(--sand)',
                    fontFamily: 'var(--structural)',
                    fontSize: 14,
                    letterSpacing: '0.02em',
                    cursor: compressing || photos.length >= 10 ? 'default' : 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {compressing ? 'Procesando…' : photos.length === 0 ? 'Agregar foto(s)' : 'Agregar más fotos'}
                </button>
                {photos.length === 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--dusk)', fontFamily: 'var(--structural)' }}>
                    Requerido — mínimo 1 foto
                  </div>
                )}
              </div>

              {/* Método de pago */}
              <div className="form-section" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: 'var(--structural)', fontSize: 13, color: 'var(--sand)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Método de pago (opcional)
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['Tarjeta', 'Sinpe', 'Efectivo'].map(op => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setMetodoPago(prev => prev === op ? '' : op)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        background: metodoPago === op ? 'var(--amber)' : 'var(--forest)',
                        border: `1px solid ${metodoPago === op ? 'var(--amber)' : 'var(--border)'}`,
                        borderRadius: 8,
                        color: metodoPago === op ? 'var(--forest)' : 'var(--dusk)',
                        fontFamily: 'var(--structural)',
                        fontSize: 13,
                        letterSpacing: '0.02em',
                        cursor: 'pointer',
                        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                      }}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detalle */}
              <div className="form-section" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: 'var(--structural)', fontSize: 13, color: 'var(--sand)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Detalle (opcional)
                </label>
                <input
                  type="text"
                  value={detalle}
                  onChange={e => setDetalle(e.target.value)}
                  placeholder="Qué es esta factura…"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'var(--forest)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--paper)',
                    fontFamily: 'var(--body)',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Monto */}
              <div className="form-section" style={{ marginBottom: 32 }}>
                <label style={{ display: 'block', fontFamily: 'var(--structural)', fontSize: 13, color: 'var(--sand)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Monto CRC (opcional)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={monto}
                  onChange={e => setMonto(e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'var(--forest)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--paper)',
                    fontFamily: 'var(--body)',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn primary"
                disabled={photos.length === 0 || sending || compressing}
                style={{ justifyContent: 'center' }}
              >
                <span className="ttl" style={{ color: 'var(--forest)' }}>
                  {sending ? 'Enviando…' : 'Enviar factura'}
                </span>
              </button>
            </form>
          )}
        </div>
      </main>

      <footer>donde el bosque respira</footer>
    </div>
  );
}
