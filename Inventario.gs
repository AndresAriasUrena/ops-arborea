

// ====================== CONFIG INVENTARIO ======================
// Hoja REAL del equipo (no una copia): título en fila 1, encabezados en fila 2,
// subtítulo "Inventario realizado…" en fila 3, datos desde la fila 4.
const INVENTARIO_SHEET_ID = '1kBjGhB4j8bfx_IYSoz27YQblb_yVJqUmiY-A2neZ_co'; // "Inventario Bodega"
const INVENTARIO_TAB = 'Hoja 1';
const INVENTARIO_DATA_START_ROW = 4;
// Columnas 1-based tal como están hoy en la hoja; ITEM_ID (F) la agrega setupInventario().
const INVENTARIO_COLS = { CAJA: 1, CATEGORIA: 2, ARTICULO: 3, CANTIDAD: 4, NOTAS: 5, ITEM_ID: 6 };
const MOVIMIENTOS_TAB = 'Movimientos';
const MOVIMIENTOS_HEADERS = [
  'timestamp', 'itemId', 'caja', 'categoria', 'articulo',
  'cantidadMovimiento', 'cantidadAntes', 'cantidadDespues',
  'responsable', 'casa', 'nota', 'submissionId', 'tipo' // tipo: 'retiro' | 'ingreso' | 'alta'
];
// ====================================================

// Lee todos los artículos desde la hoja REAL ("Hoja 1"), asignando itemId (col F)
// a las filas que todavía no lo tengan. Se llama tanto desde getInventario como
// desde retirarInventario, así que siempre queda al día antes de buscar por itemId.
function leerInventario() {
  const sh = getTabIn(INVENTARIO_SHEET_ID, INVENTARIO_TAB, null);
  const last = sh.getLastRow();
  if (last < INVENTARIO_DATA_START_ROW) return [];

  const numRows = last - INVENTARIO_DATA_START_ROW + 1;
  const range = sh.getRange(INVENTARIO_DATA_START_ROW, 1, numRows, INVENTARIO_COLS.ITEM_ID);
  const values = range.getValues();

  const out = [];
  values.forEach(function (row, i) {
    const articulo = String(row[INVENTARIO_COLS.ARTICULO - 1] || '').trim();
    if (!articulo) return; // fila vacía al final de la hoja

    let itemId = row[INVENTARIO_COLS.ITEM_ID - 1];
    if (!itemId) {
      itemId = 'INV-' + Utilities.getUuid().slice(0, 8);
      sh.getRange(INVENTARIO_DATA_START_ROW + i, INVENTARIO_COLS.ITEM_ID).setValue(itemId);
    }

    out.push({
      itemId: itemId,
      caja: String(row[INVENTARIO_COLS.CAJA - 1] || '').trim(),
      categoria: String(row[INVENTARIO_COLS.CATEGORIA - 1] || '').trim(),
      articulo: articulo,
      cantidad: Number(row[INVENTARIO_COLS.CANTIDAD - 1]) || 0,
      notas: String(row[INVENTARIO_COLS.NOTAS - 1] || '').trim()
    });
  });
  return out;
}

// Devuelve el catálogo completo; la app filtra localmente (búsqueda instantánea + funciona offline).
function getInventario(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return json({ ok: true, items: leerInventario() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Resta `cantidad` del artículo `itemId` en el momento (nunca se encola offline: necesitamos
// el stock real para no dejar que dos retiros simultáneos descuenten de más).
function retirarInventario(payload) {
  if (!payload.submissionId || !payload.itemId || !payload.responsable) {
    return json({ ok: false, error: 'Missing required fields (submissionId, itemId, responsable)' });
  }
  const cantidad = Number(payload.cantidad);
  if (!cantidad || cantidad <= 0 || !isFinite(cantidad)) {
    return json({ ok: false, error: 'Cantidad inválida' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // Idempotencia (reusa el Log de checklists, definido en Código.gs; submissionId es globalmente único)
    const dup = checkIfExists(payload.submissionId);
    if (dup) return json({ ok: true, dedup: true, submissionId: payload.submissionId });

    const sh = getTabIn(INVENTARIO_SHEET_ID, INVENTARIO_TAB, null);
    const last = sh.getLastRow();
    if (last < INVENTARIO_DATA_START_ROW) return json({ ok: false, error: 'Inventario vacío' });

    const numRows = last - INVENTARIO_DATA_START_ROW + 1;
    const idRange = sh.getRange(INVENTARIO_DATA_START_ROW, INVENTARIO_COLS.ITEM_ID, numRows, 1);
    const hit = idRange.createTextFinder(String(payload.itemId)).matchEntireCell(true).findNext();
    if (!hit) return json({ ok: false, error: 'Artículo no encontrado (puede que la lista esté desactualizada, actualizá y probá de nuevo)' });

    const rowNum = hit.getRow();
    const rowValues = sh.getRange(rowNum, 1, 1, INVENTARIO_COLS.ITEM_ID).getValues()[0];
    const actual = Number(rowValues[INVENTARIO_COLS.CANTIDAD - 1]) || 0;

    if (cantidad > actual) {
      return json({ ok: false, error: 'Solo hay ' + actual + ' disponibles', disponible: actual });
    }

    const nuevo = actual - cantidad;
    sh.getRange(rowNum, INVENTARIO_COLS.CANTIDAD).setValue(nuevo);

    const movSh = getTabIn(INVENTARIO_SHEET_ID, MOVIMIENTOS_TAB, MOVIMIENTOS_HEADERS);
    movSh.appendRow([
      new Date().toISOString(), payload.itemId,
      rowValues[INVENTARIO_COLS.CAJA - 1], rowValues[INVENTARIO_COLS.CATEGORIA - 1], rowValues[INVENTARIO_COLS.ARTICULO - 1],
      cantidad, actual, nuevo,
      payload.responsable, payload.casa || '', payload.nota || '', payload.submissionId,
      'retiro'
    ]);

    markAsProcessed(payload.submissionId, 'inventario:' + payload.itemId);

    return json({
      ok: true,
      submissionId: payload.submissionId,
      itemId: payload.itemId,
      articulo: rowValues[INVENTARIO_COLS.ARTICULO - 1],
      cantidadRetirada: cantidad,
      cantidadDisponible: nuevo
    });
  } finally {
    lock.releaseLock();
  }
}

// Suma `cantidad` a un artículo. Dos modos según el payload:
//  - payload.itemId presente  → reabastece un artículo YA existente (suma a su cantidad actual).
//  - payload.itemId ausente   → da de alta un artículo NUEVO (requiere caja/categoria/articulo),
//    lo agrega al final de la hoja con un itemId nuevo y cantidad inicial = `cantidad`.
// Igual que retirarInventario: siempre en línea, bajo LockService, nunca se encola offline.
function ingresarInventario(payload) {
  if (!payload.submissionId || !payload.responsable) {
    return json({ ok: false, error: 'Missing required fields (submissionId, responsable)' });
  }
  const cantidad = Number(payload.cantidad);
  if (!cantidad || cantidad <= 0 || !isFinite(cantidad)) {
    return json({ ok: false, error: 'Cantidad inválida' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const dup = checkIfExists(payload.submissionId);
    if (dup) return json({ ok: true, dedup: true, submissionId: payload.submissionId });

    const sh = getTabIn(INVENTARIO_SHEET_ID, INVENTARIO_TAB, null);

    let rowNum, caja, categoria, articulo, actual, itemId, esNuevo;

    if (payload.itemId) {
      // Reabastecer un artículo que ya existe
      const last = sh.getLastRow();
      if (last < INVENTARIO_DATA_START_ROW) return json({ ok: false, error: 'Inventario vacío' });

      const numRows = last - INVENTARIO_DATA_START_ROW + 1;
      const idRange = sh.getRange(INVENTARIO_DATA_START_ROW, INVENTARIO_COLS.ITEM_ID, numRows, 1);
      const hit = idRange.createTextFinder(String(payload.itemId)).matchEntireCell(true).findNext();
      if (!hit) return json({ ok: false, error: 'Artículo no encontrado (puede que la lista esté desactualizada, actualizá y probá de nuevo)' });

      rowNum = hit.getRow();
      const rowValues = sh.getRange(rowNum, 1, 1, INVENTARIO_COLS.ITEM_ID).getValues()[0];
      caja = rowValues[INVENTARIO_COLS.CAJA - 1];
      categoria = rowValues[INVENTARIO_COLS.CATEGORIA - 1];
      articulo = rowValues[INVENTARIO_COLS.ARTICULO - 1];
      actual = Number(rowValues[INVENTARIO_COLS.CANTIDAD - 1]) || 0;
      itemId = payload.itemId;
      esNuevo = false;
    } else {
      // Dar de alta un artículo nuevo (no estaba en la hoja)
      articulo = String(payload.articulo || '').trim();
      categoria = String(payload.categoria || '').trim();
      caja = String(payload.caja || '').trim();
      if (!articulo || !categoria || !caja) {
        return json({ ok: false, error: 'Faltan caja, categoría o artículo para dar de alta' });
      }

      rowNum = Math.max(sh.getLastRow() + 1, INVENTARIO_DATA_START_ROW);
      itemId = 'INV-' + Utilities.getUuid().slice(0, 8);
      actual = 0;

      sh.getRange(rowNum, INVENTARIO_COLS.CAJA).setValue(caja);
      sh.getRange(rowNum, INVENTARIO_COLS.CATEGORIA).setValue(categoria);
      sh.getRange(rowNum, INVENTARIO_COLS.ARTICULO).setValue(articulo);
      if (payload.nota) sh.getRange(rowNum, INVENTARIO_COLS.NOTAS).setValue(payload.nota);
      sh.getRange(rowNum, INVENTARIO_COLS.ITEM_ID).setValue(itemId);
      esNuevo = true;
    }

    const nuevo = actual + cantidad;
    sh.getRange(rowNum, INVENTARIO_COLS.CANTIDAD).setValue(nuevo);

    const movSh = getTabIn(INVENTARIO_SHEET_ID, MOVIMIENTOS_TAB, MOVIMIENTOS_HEADERS);
    movSh.appendRow([
      new Date().toISOString(), itemId, caja, categoria, articulo,
      cantidad, actual, nuevo,
      payload.responsable, payload.casa || '', payload.nota || '', payload.submissionId,
      esNuevo ? 'alta' : 'ingreso'
    ]);

    markAsProcessed(payload.submissionId, 'inventario-ingreso:' + itemId);

    return json({
      ok: true,
      submissionId: payload.submissionId,
      itemId: itemId,
      caja: caja,
      categoria: categoria,
      articulo: articulo,
      cantidadIngresada: cantidad,
      cantidadDisponible: nuevo,
      nuevo: esNuevo
    });
  } finally {
    lock.releaseLock();
  }
}

// Ejecutar UNA vez: asigna itemId a las filas existentes que no lo tengan y crea/repara "Movimientos".
function setupInventario() {
  const sh = getTabIn(INVENTARIO_SHEET_ID, INVENTARIO_TAB, null);
  if (sh.getRange(2, INVENTARIO_COLS.ITEM_ID).getValue() !== 'itemId') {
    sh.getRange(2, INVENTARIO_COLS.ITEM_ID).setValue('itemId').setFontWeight('bold');
  }
  const items = leerInventario(); // fuerza la asignación de itemId a las filas que falten

  // Repara encabezados de Movimientos aunque la pestaña ya exista de una corrida anterior
  // (por ejemplo, para agregar la columna 'tipo' si faltaba).
  const movSh = getTabIn(INVENTARIO_SHEET_ID, MOVIMIENTOS_TAB, MOVIMIENTOS_HEADERS);
  movSh.getRange(1, 1, 1, MOVIMIENTOS_HEADERS.length).setValues([MOVIMIENTOS_HEADERS]);
  movSh.setFrozenRows(1);
  movSh.getRange(1, 1, 1, MOVIMIENTOS_HEADERS.length).setFontWeight('bold');

  Logger.log('Inventario listo: ' + items.length + ' artículos con itemId + pestaña Movimientos (' + MOVIMIENTOS_HEADERS.length + ' columnas) lista.');
}

// ---------- Test ----------
function testGetInventario() {
  const r = doPost({ postData: { contents: JSON.stringify({
    action: 'getInventario', secret: SHARED_SECRET
  })}});
  Logger.log(r.getContent());
}
// Retira 1 unidad del primer artículo del inventario (para probar el cableado sin adivinar un itemId).
function testRetirarInventario() {
  const items = leerInventario();
  if (!items.length) { Logger.log('Inventario vacío'); return; }
  const r = doPost({ postData: { contents: JSON.stringify({
    action: 'retirarInventario',
    submissionId: 'retiro-test-' + Date.now(),
    itemId: items[0].itemId,
    cantidad: 1,
    responsable: 'Glen',
    casa: '',
    nota: 'Prueba',
    secret: SHARED_SECRET
  })}});
  Logger.log(r.getContent());
}
// Reabastece 1 unidad del primer artículo (modo "existente").
function testIngresarInventarioExistente() {
  const items = leerInventario();
  if (!items.length) { Logger.log('Inventario vacío'); return; }
  const r = doPost({ postData: { contents: JSON.stringify({
    action: 'ingresarInventario',
    submissionId: 'ingreso-test-' + Date.now(),
    itemId: items[0].itemId,
    cantidad: 1,
    responsable: 'Glen',
    nota: 'Prueba reabastecer',
    secret: SHARED_SECRET
  })}});
  Logger.log(r.getContent());
}
// Da de alta un artículo de prueba nuevo (modo "nuevo").
function testIngresarInventarioNuevo() {
  const r = doPost({ postData: { contents: JSON.stringify({
    action: 'ingresarInventario',
    submissionId: 'alta-test-' + Date.now(),
    caja: 'CAJA TEST',
    categoria: 'Prueba',
    articulo: 'Artículo de prueba ' + Date.now(),
    cantidad: 3,
    responsable: 'Glen',
    nota: 'Prueba alta',
    secret: SHARED_SECRET
  })}});
  Logger.log(r.getContent());
}
