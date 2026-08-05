'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { InventarioItem, RetiroPayload, IngresoPayload } from '@/config';
import { houses } from '@/config';
import { fetchInventario, filterInventario, retirarArticulo, ingresarArticulo } from '@/lib/inventario';
import { BoxIcon, SearchIcon } from '@/lib/icons';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

type LoadState = 'idle' | 'loading' | 'ok' | 'error';
type Step = 'search' | 'detalle' | 'nuevo' | 'done';
type Modo = 'retirar' | 'agregar';

const UMBRAL_BAJO = 3; // cantidad en o por debajo de esto se resalta como "queda poco"

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'var(--forest)', border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--paper)', fontFamily: 'var(--body)', fontSize: 15,
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--structural)', fontSize: 13, color: 'var(--sand)',
  letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8,
};

export default function InventarioPage() {
  const router = useRouter();

  const [responsable, setResponsable] = useState('');
  const [isGerencia, setIsGerencia] = useState(false);
  const [online, setOnline] = useState(true);

  const [step, setStep] = useState<Step>('search');
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [fromCache, setFromCache] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');

  // Paso "detalle": retirar o agregar stock a un artículo existente
  const [selected, setSelected] = useState<InventarioItem | null>(null);
  const [modo, setModo] = useState<Modo>('retirar');
  const [cantidad, setCantidad] = useState(1);
  const [casa, setCasa] = useState('');
  const [nota, setNota] = useState('');
  const [sending, setSending] = useState(false);
  const [detalleError, setDetalleError] = useState('');

  // Paso "nuevo": dar de alta un artículo que no está en la lista
  const [nCaja, setNCaja] = useState('');
  const [nCategoria, setNCategoria] = useState('');
  const [nArticulo, setNArticulo] = useState('');
  const [nCantidad, setNCantidad] = useState(1);
  const [nNota, setNNota] = useState('');
  const [nuevoError, setNuevoError] = useState('');

  const [doneMsg, setDoneMsg] = useState('');

  const load = useCallback(async () => {
    setLoadState('loading');
    setLoadError('');
    try {
      const result = await fetchInventario();
      if (result.ok) {
        setItems(result.items);
        setFromCache(result.fromCache ?? false);
        setLoadState('ok');
      } else {
        setLoadError(result.error || 'Error desconocido');
        setLoadState('error');
      }
    } catch {
      setLoadError('Error inesperado al cargar');
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('arborea_responsable');
    if (!saved) {
      router.push('/');
      return;
    }
    setResponsable(saved);
    setIsGerencia(localStorage.getItem('arborea_gerencia_ok') === 'true');
    load();

    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [router, load]);

  const filtered = useMemo(() => {
    const list = filterInventario(items, query);
    return [...list].sort((a, b) =>
      a.categoria.localeCompare(b.categoria) || a.articulo.localeCompare(b.articulo)
    );
  }, [items, query]);

  const categoriasExistentes = useMemo(
    () => Array.from(new Set(items.map(i => i.categoria).filter(Boolean))).sort(),
    [items]
  );
  const cajasExistentes = useMemo(
    () => Array.from(new Set(items.map(i => i.caja).filter(Boolean))).sort(),
    [items]
  );

  function handleBack() {
    router.push(isGerencia ? '/gerencia' : '/');
  }

  function openDetalle(item: InventarioItem, modoInicial: Modo = 'retirar') {
    setSelected(item);
    setModo(item.cantidad <= 0 ? 'agregar' : modoInicial);
    setCantidad(1);
    setCasa('');
    setNota('');
    setDetalleError('');
    setStep('detalle');
  }

  function openNuevo() {
    setNCaja('');
    setNCategoria('');
    setNArticulo('');
    setNCantidad(1);
    setNNota('');
    setNuevoError('');
    setStep('nuevo');
  }

  function backToSearch() {
    setSelected(null);
    setStep('search');
  }

  async function handleConfirmarDetalle() {
    if (!selected || sending) return;
    setSending(true);
    setDetalleError('');

    if (modo === 'retirar') {
      const payload: RetiroPayload = {
        action: 'retirarInventario',
        submissionId: generateUUID(),
        itemId: selected.itemId,
        cantidad,
        responsable,
        casa: casa || undefined,
        nota: nota.trim() || undefined,
      };
      const result = await retirarArticulo(payload);
      setSending(false);

      if (result.ok) {
        const disponible = result.cantidadDisponible ?? Math.max(0, selected.cantidad - cantidad);
        setItems(prev => prev.map(it => it.itemId === selected.itemId ? { ...it, cantidad: disponible } : it));
        setDoneMsg(`Retirado: ${cantidad} × ${selected.articulo} — quedan ${disponible}`);
        setStep('done');
        setTimeout(() => { setDoneMsg(''); backToSearch(); }, 1800);
      } else {
        setDetalleError(result.error || 'No se pudo retirar');
        const conDisponible = result as { disponible?: number };
        if (typeof conDisponible.disponible === 'number') {
          setItems(prev => prev.map(it => it.itemId === selected.itemId ? { ...it, cantidad: conDisponible.disponible as number } : it));
        }
      }
    } else {
      const payload: IngresoPayload = {
        action: 'ingresarInventario',
        submissionId: generateUUID(),
        itemId: selected.itemId,
        cantidad,
        responsable,
        casa: casa || undefined,
        nota: nota.trim() || undefined,
      };
      const result = await ingresarArticulo(payload);
      setSending(false);

      if (result.ok) {
        const disponible = result.cantidadDisponible ?? (selected.cantidad + cantidad);
        setItems(prev => prev.map(it => it.itemId === selected.itemId ? { ...it, cantidad: disponible } : it));
        setDoneMsg(`Agregado: ${cantidad} × ${selected.articulo} — ahora hay ${disponible}`);
        setStep('done');
        setTimeout(() => { setDoneMsg(''); backToSearch(); }, 1800);
      } else {
        setDetalleError(result.error || 'No se pudo agregar');
      }
    }
  }

  async function handleConfirmarNuevo() {
    if (sending) return;
    if (!nArticulo.trim() || !nCategoria.trim() || !nCaja.trim()) {
      setNuevoError('Completá caja, categoría y artículo');
      return;
    }
    setSending(true);
    setNuevoError('');

    const payload: IngresoPayload = {
      action: 'ingresarInventario',
      submissionId: generateUUID(),
      caja: nCaja.trim(),
      categoria: nCategoria.trim(),
      articulo: nArticulo.trim(),
      cantidad: nCantidad,
      responsable,
      nota: nNota.trim() || undefined,
    };
    const result = await ingresarArticulo(payload);
    setSending(false);

    if (result.ok && result.itemId) {
      setItems(prev => [...prev, {
        itemId: result.itemId as string,
        caja: payload.caja as string,
        categoria: payload.categoria as string,
        articulo: payload.articulo as string,
        cantidad: result.cantidadDisponible ?? nCantidad,
        notas: nNota.trim(),
      }]);
      setDoneMsg(`Artículo nuevo: ${nArticulo.trim()} — cantidad inicial ${nCantidad}`);
      setStep('done');
      setTimeout(() => { setDoneMsg(''); backToSearch(); }, 1800);
    } else {
      setNuevoError(result.error || 'No se pudo agregar el artículo');
    }
  }

  if (!responsable) return null;

  return (
    <div className="wrap">
      <header>
        <Image src="/sub-logo.png" alt="Arbórea Experiences" width={188} height={48} className="lockup" priority />
        <div className="trail">
          <button
            onClick={handleBack}
            style={{ background: 'none', border: 'none', color: 'var(--sand)', fontFamily: 'var(--structural)', fontSize: 13, cursor: 'pointer', padding: 0 }}
          >
            {isGerencia ? 'Gerencia' : responsable}
          </button>
          <span className="sep">→</span>
        </div>
      </header>

      <main>
        <div className="view" style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: step === 'search' ? 18 : 22 }}>
            <div className="step" style={{ margin: 0 }}>
              {step === 'search' && 'Inventario bodega'}
              {step === 'detalle' && (modo === 'retirar' ? 'Retirar artículo' : 'Agregar stock')}
              {step === 'nuevo' && 'Artículo nuevo'}
              {step === 'done' && 'Inventario bodega'}
            </div>
            {step === 'search' && (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <button
                  onClick={openNuevo}
                  style={{
                    background: 'none', border: 'none', color: 'var(--amber)',
                    fontFamily: 'var(--structural)', fontSize: 13, letterSpacing: '0.02em',
                    cursor: 'pointer', padding: '4px 0',
                  }}
                >
                  + Nuevo
                </button>
                <button
                  onClick={load}
                  disabled={loadState === 'loading'}
                  style={{
                    background: 'none', border: 'none',
                    color: loadState === 'loading' ? 'var(--dusk)' : 'var(--amber)',
                    fontFamily: 'var(--structural)', fontSize: 13, letterSpacing: '0.02em',
                    cursor: loadState === 'loading' ? 'default' : 'pointer', padding: '4px 0',
                  }}
                >
                  {loadState === 'loading' ? 'Actualizando…' : 'Actualizar'}
                </button>
              </div>
            )}
          </div>

          {!online && (step === 'search' || step === 'detalle' || step === 'nuevo') && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(255, 210, 169, 0.12)', border: '1px solid var(--border)',
              color: 'var(--sand)', fontFamily: 'var(--structural)', fontSize: 12.5, letterSpacing: '0.01em',
              textAlign: 'center',
            }}>
              Sin conexión — podés buscar con la última copia guardada, pero para retirar o agregar necesitás conexión.
            </div>
          )}

          {/* ── Paso: buscar ─────────────────────────────────────────── */}
          {step === 'search' && (
            <>
              {loadState === 'loading' && (
                <div style={{ color: 'var(--slate)', fontFamily: 'var(--structural)', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
                  Cargando inventario…
                </div>
              )}

              {loadState === 'error' && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ color: 'var(--slate)', fontFamily: 'var(--structural)', fontSize: 14, marginBottom: 8 }}>
                    No se pudo cargar el inventario
                  </div>
                  {loadError && (
                    <div style={{ color: 'var(--dusk)', fontFamily: 'var(--structural)', fontSize: 12, marginBottom: 20 }}>
                      {loadError}
                    </div>
                  )}
                  <button onClick={load} className="btn primary" style={{ maxWidth: 200, margin: '0 auto', justifyContent: 'center' }}>
                    <span className="ttl" style={{ color: 'var(--forest)' }}>Reintentar</span>
                  </button>
                </div>
              )}

              {loadState === 'ok' && (
                <>
                  {fromCache && (
                    <div style={{ color: 'var(--dusk)', fontFamily: 'var(--structural)', fontSize: 12, letterSpacing: '0.01em', marginBottom: 14, textAlign: 'center' }}>
                      Mostrando datos guardados
                    </div>
                  )}

                  <div style={{ position: 'relative', marginBottom: 18 }}>
                    <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--dusk)', width: 18, height: 18 }}>
                      <SearchIcon />
                    </div>
                    <input
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Buscar artículo, categoría o caja…"
                      autoFocus
                      style={{ ...inputStyle, padding: '13px 14px 13px 42px', fontSize: 16 }}
                    />
                  </div>

                  <div style={{ color: 'var(--dusk)', fontFamily: 'var(--structural)', fontSize: 12, letterSpacing: '0.02em', marginBottom: 12 }}>
                    {filtered.length} {filtered.length === 1 ? 'artículo' : 'artículos'}
                  </div>

                  {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <div style={{ color: 'var(--slate)', fontFamily: 'var(--structural)', fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
                        Sin resultados para &ldquo;{query}&rdquo;
                      </div>
                      <button
                        onClick={openNuevo}
                        className="btn secondary"
                        style={{ maxWidth: 260, margin: '0 auto', justifyContent: 'center' }}
                      >
                        <span className="ttl">+ Dar de alta este artículo</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid">
                      {filtered.map(item => {
                        const agotado = item.cantidad <= 0;
                        const bajo = !agotado && item.cantidad <= UMBRAL_BAJO;
                        return (
                          <button key={item.itemId} className="btn" onClick={() => openDetalle(item)}>
                            <div className="ico" style={{ color: agotado ? 'var(--dusk)' : bajo ? 'var(--amber)' : 'var(--slate)' }}>
                              <BoxIcon />
                            </div>
                            <div className="body">
                              <div className="ttl">{item.articulo}</div>
                              <div className="sub">{item.categoria} · {item.caja}</div>
                            </div>
                            <div style={{
                              marginLeft: 'auto', flex: '0 0 auto',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              minWidth: 34, height: 28, padding: '0 8px', borderRadius: 14,
                              background: agotado ? 'rgba(125,133,132,0.18)' : bajo ? 'rgba(255,210,169,0.18)' : 'var(--forest)',
                              border: `1px solid ${agotado ? 'var(--border)' : bajo ? 'var(--amber)' : 'var(--border)'}`,
                              color: agotado ? 'var(--dusk)' : bajo ? 'var(--amber)' : 'var(--sand)',
                              fontFamily: 'var(--structural)', fontSize: 13, fontWeight: 600,
                            }}>
                              {agotado ? '0' : item.cantidad}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Paso: retirar / agregar stock ───────────────────────────── */}
          {step === 'detalle' && selected && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--structural)', fontSize: 19, fontWeight: 500, color: 'var(--paper)', marginBottom: 6 }}>
                  {selected.articulo}
                </div>
                <div style={{ fontFamily: 'var(--structural)', fontSize: 13, color: 'var(--slate)', letterSpacing: '0.01em' }}>
                  {selected.categoria} · {selected.caja} · Disponible: {selected.cantidad}
                </div>
                {selected.notas && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--sand)', fontFamily: 'var(--quiet)', fontSize: 13.5, lineHeight: 1.5 }}>
                    {selected.notas}
                  </div>
                )}
              </div>

              {/* Modo: retirar / agregar */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
                {(['retirar', 'agregar'] as Modo[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setModo(m); setCantidad(1); setDetalleError(''); }}
                    disabled={m === 'retirar' && selected.cantidad <= 0}
                    style={{
                      flex: 1, padding: '11px 0',
                      background: modo === m ? 'var(--amber)' : 'var(--forest)',
                      border: `1px solid ${modo === m ? 'var(--amber)' : 'var(--border)'}`,
                      borderRadius: 8,
                      color: (m === 'retirar' && selected.cantidad <= 0) ? 'var(--dusk)' : modo === m ? 'var(--forest)' : 'var(--sand)',
                      fontFamily: 'var(--structural)', fontSize: 14, letterSpacing: '0.02em',
                      cursor: (m === 'retirar' && selected.cantidad <= 0) ? 'default' : 'pointer',
                      transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                    }}
                  >
                    {m === 'retirar' ? 'Retirar' : 'Agregar stock'}
                  </button>
                ))}
              </div>

              {/* Cantidad */}
              <div className="form-section" style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  Cantidad a {modo === 'retirar' ? 'retirar' : 'agregar'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button
                    type="button"
                    onClick={() => setCantidad(c => Math.max(1, c - 1))}
                    disabled={cantidad <= 1}
                    style={{
                      width: 44, height: 44, borderRadius: 8, background: 'var(--forest)', border: '1px solid var(--border)',
                      color: cantidad <= 1 ? 'var(--dusk)' : 'var(--paper)', fontSize: 20, lineHeight: 1,
                      cursor: cantidad <= 1 ? 'default' : 'pointer',
                    }}
                    aria-label="Menos"
                  >
                    −
                  </button>
                  <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--structural)', fontSize: 24, color: 'var(--paper)' }}>
                    {cantidad}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCantidad(c => modo === 'retirar' ? Math.min(selected.cantidad, c + 1) : c + 1)}
                    disabled={modo === 'retirar' && cantidad >= selected.cantidad}
                    style={{
                      width: 44, height: 44, borderRadius: 8, background: 'var(--forest)', border: '1px solid var(--border)',
                      color: (modo === 'retirar' && cantidad >= selected.cantidad) ? 'var(--dusk)' : 'var(--paper)', fontSize: 20, lineHeight: 1,
                      cursor: (modo === 'retirar' && cantidad >= selected.cantidad) ? 'default' : 'pointer',
                    }}
                    aria-label="Más"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Casa (opcional) */}
              <div className="form-section" style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Casa (opcional)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {houses.map(h => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setCasa(prev => prev === h.name ? '' : h.name)}
                      style={{
                        padding: '9px 14px',
                        background: casa === h.name ? 'var(--amber)' : 'var(--forest)',
                        border: `1px solid ${casa === h.name ? 'var(--amber)' : 'var(--border)'}`,
                        borderRadius: 20,
                        color: casa === h.name ? 'var(--forest)' : 'var(--dusk)',
                        fontFamily: 'var(--structural)', fontSize: 13, letterSpacing: '0.02em',
                        cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                      }}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nota (opcional) */}
              <div className="form-section" style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Nota (opcional)</label>
                <input
                  type="text"
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder={modo === 'retirar' ? 'Para qué se usa…' : 'De dónde viene…'}
                  style={inputStyle}
                />
              </div>

              {detalleError && (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,138,128,0.1)', border: '1px solid #FF8A80', color: '#FF8A80', fontFamily: 'var(--structural)', fontSize: 13, textAlign: 'center' }}>
                  {detalleError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn secondary" onClick={backToSearch} disabled={sending} style={{ justifyContent: 'center' }}>
                  <span className="ttl">Cancelar</span>
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleConfirmarDetalle}
                  disabled={sending || !online}
                  style={{ justifyContent: 'center' }}
                >
                  <span className="ttl" style={{ color: 'var(--forest)' }}>
                    {sending ? 'Guardando…' : !online ? 'Sin conexión' : (modo === 'retirar' ? 'Retirar' : 'Agregar')}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── Paso: artículo nuevo ─────────────────────────────────────── */}
          {step === 'nuevo' && (
            <div>
              <div className="form-section" style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Artículo</label>
                <input
                  type="text"
                  value={nArticulo}
                  onChange={e => setNArticulo(e.target.value)}
                  placeholder="Nombre del artículo"
                  autoFocus
                  style={inputStyle}
                />
              </div>

              <div className="form-section" style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Categoría</label>
                <input
                  type="text"
                  list="categorias-existentes"
                  value={nCategoria}
                  onChange={e => setNCategoria(e.target.value)}
                  placeholder="Ej: Eléctrico, Grifería…"
                  style={inputStyle}
                />
                <datalist id="categorias-existentes">
                  {categoriasExistentes.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="form-section" style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Caja</label>
                <input
                  type="text"
                  list="cajas-existentes"
                  value={nCaja}
                  onChange={e => setNCaja(e.target.value)}
                  placeholder="Ej: CAJA 14"
                  style={inputStyle}
                />
                <datalist id="cajas-existentes">
                  {cajasExistentes.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="form-section" style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Cantidad inicial</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button
                    type="button"
                    onClick={() => setNCantidad(c => Math.max(1, c - 1))}
                    disabled={nCantidad <= 1}
                    style={{
                      width: 44, height: 44, borderRadius: 8, background: 'var(--forest)', border: '1px solid var(--border)',
                      color: nCantidad <= 1 ? 'var(--dusk)' : 'var(--paper)', fontSize: 20, lineHeight: 1,
                      cursor: nCantidad <= 1 ? 'default' : 'pointer',
                    }}
                    aria-label="Menos"
                  >
                    −
                  </button>
                  <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--structural)', fontSize: 24, color: 'var(--paper)' }}>
                    {nCantidad}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNCantidad(c => c + 1)}
                    style={{
                      width: 44, height: 44, borderRadius: 8, background: 'var(--forest)', border: '1px solid var(--border)',
                      color: 'var(--paper)', fontSize: 20, lineHeight: 1, cursor: 'pointer',
                    }}
                    aria-label="Más"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="form-section" style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Nota (opcional)</label>
                <input
                  type="text"
                  value={nNota}
                  onChange={e => setNNota(e.target.value)}
                  placeholder="Detalle del artículo…"
                  style={inputStyle}
                />
              </div>

              {nuevoError && (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,138,128,0.1)', border: '1px solid #FF8A80', color: '#FF8A80', fontFamily: 'var(--structural)', fontSize: 13, textAlign: 'center' }}>
                  {nuevoError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn secondary" onClick={backToSearch} disabled={sending} style={{ justifyContent: 'center' }}>
                  <span className="ttl">Cancelar</span>
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleConfirmarNuevo}
                  disabled={sending || !online}
                  style={{ justifyContent: 'center' }}
                >
                  <span className="ttl" style={{ color: 'var(--forest)' }}>
                    {sending ? 'Guardando…' : !online ? 'Sin conexión' : 'Agregar al inventario'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── Paso: hecho ──────────────────────────────────────────── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--paper)', fontFamily: 'var(--structural)', fontSize: 15, lineHeight: 1.6 }}>
              {doneMsg}
            </div>
          )}
        </div>
      </main>

      <footer>donde el bosque respira</footer>
    </div>
  );
}
