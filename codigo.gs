/**
 * Arbórea Operations — Backend Apps Script (endurecido) — V6
 * Reemplaza el contenido completo de Código.gs por esto.
 *
 * Cambios V6 (sobre V5):
 *  - NUEVO módulo Inventario Bodega, en archivo APARTE dentro de este mismo proyecto
 *    de Apps Script: ver Inventario.gs (mismo despliegue/URL, mismo SHARED_SECRET;
 *    solo separado para no mezclar el código en un único archivo gigante).
 *    doPost() de acá abajo enruta 'getInventario' / 'retirarInventario' hacia las
 *    funciones definidas en Inventario.gs — funciona porque Apps Script comparte el
 *    scope global entre todos los archivos .gs de un mismo proyecto.
 *
 * Cambios V5 (se conservan):
 *  - NUEVO módulo Gastos / Facturas:
 *      · Acción guardarGasto → escribe al sheet "Registro Gastos" (aparte)
 *        y sube las fotos a la carpeta "Arborea gastos" en Drive.
 *      · Foto obligatoria (mínimo 1, permite varias). detalle y monto opcionales.
 *      · casa opcional; responsable obligatorio (lo inyecta la app).
 *      · Idempotente por submissionId (reusa la hoja Log de checklists;
 *        submissionId es globalmente único).
 *      · setupGastos() crea la hoja "Gastos" con encabezados y validaciones.
 *  - getTab ahora delega en getTabIn(ssId, ...) para poder escribir en OTRO spreadsheet.
 *
 * Cambios V4 (se conservan):
 *  - Lectura de tareas en DOS acciones: getTareas / getTareasManagement.
 *  - completarTarea enruta por payload.scope; archivarTareas archiva ambas hojas.
 *  - setupManagement() crea la hoja Management.
 */

// ====================== CONFIG ======================
const SHARED_SECRET  = 'arborea2025secure'; // = NEXT_PUBLIC_SHARED_SECRET (cambialo por algo más fuerte)

// ⚠️ COPIÁ ESTE ID DIRECTO DE LA BARRA DE DIRECCIONES de la carpeta abierta en Drive.
// Ojo con l (ele) vs I (i mayúscula) y 0 (cero) vs O. Si testDoPost dice "not found", es esto.
const DRIVE_FOLDER_ID = '1_80rGUDaavK1IKzg7hdpc1s4DlzWjOzf';

const SHEET_ID = '1v6x9KTFCT9Cjk9wEpd0PzEK0J4eCnC3LwDmH0JNnLDE'; // "Registro Checklists"
const TZ = 'America/Costa_Rica';
const SUBMISSIONS_TAB = 'Submissions';
const LOG_TAB = 'Log';

// ---- Tareas ----
const TAREAS_TAB = 'Tareas';           // tareas de campo (operarios)
const MANAGEMENT_TAB = 'Management';    // tareas de gerencia (Alex)
const TAREAS_HEADERS = [
  'taskId', 'responsable', 'casa', 'titulo', 'descripcion', 'prioridad',
  'semana', 'estado', 'createdAt', 'completadaEn', 'observaciones', 'fotoUrl'
];

// Hojas a barrer SOLO en el archivado nocturno (no en las lecturas).
const TASK_TABS = [TAREAS_TAB, MANAGEMENT_TAB];

// ---- Archivado ----
const ARCHIVO_TAB = 'Tareas_Archivo';
const DIAS_ARCHIVO = 7; // mover a archivo una semana después de completada

// ---- Gastos / Facturas ----
const GASTOS_SHEET_ID  = '10Oc9nEljl0IZW2euhyJQQp73iJeHKMqpj8ar4X5uqMI'; // "Registro Gastos" (aparte)
const GASTOS_FOLDER_ID = '1XJVa7IO-Q9ruZY3kC4hyxWglWvepNeoi';            // carpeta "Arborea gastos"
const GASTOS_TAB = 'Gastos';
// Columnas: las primeras las escribe la app; las últimas (proveedor…notas) las llena contabilidad a mano.
const GASTOS_HEADERS = [
  'serverTimestamp', 'deviceTimestamp', 'responsable', 'casa',
  'detalle', 'monto', 'fotos', 'folderUrl', 'gastoId',
  'proveedor', 'categoria', 'metodoPago', 'estado', 'notasContabilidad'
];

// Config del módulo Inventario (INVENTARIO_SHEET_ID, MOVIMIENTOS_TAB, etc.) vive en Inventario.gs.
// ====================================================

function doGet() {
  return json({ ok: true, service: 'arborea-ops', ts: new Date().toISOString() });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    if (payload.secret !== SHARED_SECRET) return json({ ok: false, error: 'Unauthorized' });

    // Acciones específicas antes de la validación de checklists.
    if (payload.action === 'getTareas')           return getTareas(payload);
    if (payload.action === 'getTareasManagement') return getTareasManagement(payload);
    if (payload.action === 'guardarGasto')        return guardarGasto(payload);
    if (payload.action === 'getInventario')       return getInventario(payload);       // definida en Inventario.gs
    if (payload.action === 'retirarInventario')   return retirarInventario(payload);   // definida en Inventario.gs
    if (payload.action === 'ingresarInventario')  return ingresarInventario(payload);  // definida en Inventario.gs
    if (payload.tipo   === 'tarea_completada')    return completarTarea(payload);

    if (!payload.submissionId || !payload.casa || !payload.checklistId || !payload.responsable) {
      return json({ ok: false, error: 'Missing required fields' });
    }

    // Serializa para evitar carpetas duplicadas cuando varias tablets descargan su cola a la vez.
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      // Idempotencia: cache rápido -> hoja Log persistente (escala, sin tope de 500KB).
      const existing = checkIfExists(payload.submissionId);
      if (existing) {
        return json({ ok: true, submissionId: payload.submissionId, folderUrl: existing, dedup: true });
      }

      const date  = payload.deviceTimestamp ? new Date(payload.deviceTimestamp) : new Date();
      const ym    = Utilities.formatDate(date, TZ, 'yyyy-MM');
      const stamp = Utilities.formatDate(date, TZ, 'yyyy-MM-dd_HHmm');
      const label = payload.checklistLabel || payload.checklistId;

      // Carpeta POR ENVÍO: Raíz / Casa / Checklist / YYYY-MM / stamp_responsable /
      const root   = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const folder = mkpath(root, [payload.casa, label, ym, stamp + '_' + payload.responsable]);

      // Fotos
      const photoUrls = [];
      (payload.photos || []).forEach(function (p, i) {
        const name = stamp + '_' + payload.responsable + '_foto' + (i + 1) + '.jpg';
        const blob = Utilities.newBlob(Utilities.base64Decode(p.dataBase64), p.mime || 'image/jpeg', name);
        photoUrls.push(folder.createFile(blob).getUrl());
      });

      // Respaldo data.json dentro de la carpeta del envío
      const meta = {
        submissionId: payload.submissionId,
        casa: payload.casa,
        checklistId: payload.checklistId,
        checklistLabel: label,
        responsable: payload.responsable,
        deviceTimestamp: payload.deviceTimestamp || '',
        serverTimestamp: new Date().toISOString(),
        answers: payload.answers || {},
        notes: payload.notes || '',
        photoUrls: photoUrls,
        photoCount: photoUrls.length,
        folderUrl: folder.getUrl()
      };
      folder.createFile(Utilities.newBlob(JSON.stringify(meta, null, 2), 'application/json', stamp + '_data.json'));

      // Índice en el Sheet
      appendToSheet(meta);

      // Marcar procesado (cache + Log)
      markAsProcessed(payload.submissionId, folder.getUrl());

      return json({ ok: true, submissionId: payload.submissionId, folderUrl: folder.getUrl() });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    Logger.log('Error: ' + err);
    return json({ ok: false, error: String(err) });
  }
}

// mkdir -p, saneando nombres para no romper la ruta
function mkpath(parent, parts) {
  let f = parent;
  parts.forEach(function (name) {
    const safe = String(name).replace(/[\/\\]/g, '-').trim();
    const it = f.getFoldersByName(safe);
    f = it.hasNext() ? it.next() : f.createFolder(safe);
  });
  return f;
}

// ---------- Idempotencia ----------
function checkIfExists(id) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(id);
  if (cached) return cached; // folderUrl

  const log = getTab(LOG_TAB, ['submissionId', 'folderUrl', 'serverTimestamp']);
  if (log.getLastRow() > 1) {
    const hit = log.getRange(1, 1, log.getLastRow(), 1).createTextFinder(id).matchEntireCell(true).findNext();
    if (hit) {
      const url = log.getRange(hit.getRow(), 2).getValue();
      cache.put(id, url, 21600);
      return url;
    }
  }
  return null;
}

function markAsProcessed(id, folderUrl) {
  CacheService.getScriptCache().put(id, folderUrl, 21600);
  getTab(LOG_TAB, ['submissionId', 'folderUrl', 'serverTimestamp'])
    .appendRow([id, folderUrl, new Date().toISOString()]);
}

// ---------- Índice en Sheet ----------
function appendToSheet(m) {
  const sh = getTab(SUBMISSIONS_TAB, [
    'serverTimestamp', 'deviceTimestamp', 'casa', 'checklist', 'responsable',
    'answers (JSON)', 'notes', 'fotos', 'folderUrl', 'submissionId'
  ]);
  sh.appendRow([
    m.serverTimestamp, m.deviceTimestamp, m.casa, m.checklistLabel, m.responsable,
    JSON.stringify(m.answers), m.notes, m.photoCount, m.folderUrl, m.submissionId
  ]);
}

// Abre una pestaña (creándola con encabezados si falta) en el spreadsheet indicado.
function getTabIn(ssId, name, headers) {
  const ss = SpreadsheetApp.openById(ssId);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0 && headers) sh.appendRow(headers);
  return sh;
}

// Atajo para el spreadsheet de checklists (comportamiento original).
function getTab(name, headers) {
  return getTabIn(SHEET_ID, name, headers);
}

// ContentService SIEMPRE responde 200; el cliente debe leer body.ok (no el status HTTP).
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ====================== GASTOS / FACTURAS ======================

// Guarda una factura: fotos a Drive ("Arborea gastos") + fila índice en "Registro Gastos".
// Requisitos: submissionId, responsable y >=1 foto. detalle, monto y casa son opcionales.
function guardarGasto(payload) {
  if (!payload.submissionId || !payload.responsable) {
    return json({ ok: false, error: 'Missing required fields (submissionId, responsable)' });
  }
  if (!payload.photos || !payload.photos.length) {
    return json({ ok: false, error: 'Se requiere al menos una foto de la factura' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // Idempotencia: reusa el Log de checklists (submissionId es globalmente único).
    const existing = checkIfExists(payload.submissionId);
    if (existing) {
      return json({ ok: true, submissionId: payload.submissionId, folderUrl: existing, dedup: true });
    }

    const date    = payload.deviceTimestamp ? new Date(payload.deviceTimestamp) : new Date();
    const ym      = Utilities.formatDate(date, TZ, 'yyyy-MM');
    const stamp   = Utilities.formatDate(date, TZ, 'yyyy-MM-dd_HHmm');
    const shortId = String(payload.submissionId).slice(-6); // evita colisión de carpeta en el mismo minuto
    const casa    = payload.casa || '';

    // Carpeta POR GASTO dentro de "Arborea gastos": YYYY-MM / stamp_responsable[_casa]_shortId /
    const root = DriveApp.getFolderById(GASTOS_FOLDER_ID);
    const folderName = stamp + '_' + payload.responsable + (casa ? '_' + casa : '') + '_' + shortId;
    const folder = mkpath(root, [ym, folderName]);

    // Fotos (>=1)
    const photoUrls = [];
    payload.photos.forEach(function (p, i) {
      const name = stamp + '_' + payload.responsable + '_factura' + (i + 1) + '.jpg';
      const blob = Utilities.newBlob(Utilities.base64Decode(p.dataBase64), p.mime || 'image/jpeg', name);
      photoUrls.push(folder.createFile(blob).getUrl());
    });

    // Respaldo data.json dentro de la carpeta del gasto
    const meta = {
      submissionId: payload.submissionId,
      responsable: payload.responsable,
      casa: casa,
      detalle: payload.detalle || '',
      monto: payload.monto || '',
      deviceTimestamp: payload.deviceTimestamp || '',
      serverTimestamp: new Date().toISOString(),
      photoUrls: photoUrls,
      photoCount: photoUrls.length,
      folderUrl: folder.getUrl()
    };
    folder.createFile(Utilities.newBlob(JSON.stringify(meta, null, 2), 'application/json', stamp + '_data.json'));

    // Índice en el Sheet de Gastos (columnas de contabilidad quedan en blanco)
    appendGastoToSheet(meta);

    // Marcar procesado (cache + Log en el sheet de checklists)
    markAsProcessed(payload.submissionId, folder.getUrl());

    return json({ ok: true, submissionId: payload.submissionId, folderUrl: folder.getUrl() });
  } finally {
    lock.releaseLock();
  }
}

function appendGastoToSheet(m) {
  const sh = getTabIn(GASTOS_SHEET_ID, GASTOS_TAB, GASTOS_HEADERS);
  sh.appendRow([
    m.serverTimestamp, m.deviceTimestamp, m.responsable, m.casa,
    m.detalle, m.monto, m.photoCount, m.folderUrl, m.submissionId,
    '', '', '', '', '' // proveedor, categoria, metodoPago, estado, notasContabilidad (contabilidad)
  ]);
}

// Ejecutar UNA vez: crea la hoja "Gastos" con encabezados y validaciones (desplegables).
function setupGastos() {
  const sh = getTabIn(GASTOS_SHEET_ID, GASTOS_TAB, GASTOS_HEADERS);

  // casa (col D): opcional; si se llena debe estar en la lista
  sh.getRange('D2:D').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Ceiba', 'Ron Ron', 'Mango', 'Palmera Azul'], true)
      .setAllowInvalid(false).build());

  // estado contable (col M): desplegable para contabilidad
  sh.getRange('M2:M').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['pendiente', 'aprobado', 'reembolsado', 'rechazado'], true)
      .setAllowInvalid(false).build());

  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, GASTOS_HEADERS.length).setFontWeight('bold');
  Logger.log('Hoja Gastos lista con encabezados y validaciones.');
}

// ====================== TAREAS ======================

// Crea (si faltan) las pestañas con cabeceras.
function setupTareas() {
  getTab(TAREAS_TAB, TAREAS_HEADERS);
}

// Lee las tareas NO completadas de una persona en UNA hoja concreta.
// De paso asigna taskId estable a las filas nuevas que el admin dejó sin id.
// El prefijo con la inicial de la hoja evita colisión de ids entre Tareas y Management.
function leerTareasDeHoja(sh, responsable) {
  const out = [];
  const last = sh.getLastRow();
  if (last <= 1) return out;

  const values = sh.getRange(2, 1, last - 1, TAREAS_HEADERS.length).getValues();
  const inicial = sh.getName().charAt(0); // 'T' (Tareas) o 'M' (Management)
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rowNum = i + 2;
    if (!row[0]) {
      row[0] = 'T' + Date.now() + '-' + inicial + rowNum;
      sh.getRange(rowNum, 1).setValue(row[0]);
    }
    const estado = String(row[7] || '').toLowerCase().trim();
    if (String(row[1]).trim() === String(responsable).trim() && estado !== 'completado') {
      out.push({
        taskId: row[0], responsable: row[1], casa: row[2], titulo: row[3],
        descripcion: row[4], prioridad: String(row[5] || 'normal').toLowerCase().trim(),
        semana: row[6], estado: estado || 'asignado'
      });
    }
  }
  return out;
}

// CAMPO: lee SOLO la hoja Tareas.
function getTareas(payload) {
  if (!payload.responsable) return json({ ok: false, error: 'Missing responsable' });
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getTab(TAREAS_TAB, TAREAS_HEADERS);
    return json({ ok: true, tareas: leerTareasDeHoja(sh, payload.responsable) });
  } finally {
    lock.releaseLock();
  }
}

// GERENCIA: lee SOLO la hoja Management.
function getTareasManagement(payload) {
  if (!payload.responsable) return json({ ok: false, error: 'Missing responsable' });
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getTab(MANAGEMENT_TAB, TAREAS_HEADERS);
    return json({ ok: true, tareas: leerTareasDeHoja(sh, payload.responsable) });
  } finally {
    lock.releaseLock();
  }
}

// Cierre: marca la tarea como completada, guarda observaciones y fotos opcionales.
// Enruta por payload.scope; fallback a la otra hoja solo si el taskId no aparece.
function completarTarea(payload) {
  if (!payload.taskId || !payload.submissionId) return json({ ok: false, error: 'Missing fields' });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // Idempotencia (reusa el Log de checklists)
    const dup = checkIfExists(payload.submissionId);
    if (dup) return json({ ok: true, dedup: true, taskId: payload.taskId });

    const primaryTab  = (payload.scope === 'management') ? MANAGEMENT_TAB : TAREAS_TAB;
    const fallbackTab = (primaryTab === MANAGEMENT_TAB)  ? TAREAS_TAB     : MANAGEMENT_TAB;

    let sh = null, rowNum = -1;
    [primaryTab, fallbackTab].forEach(function (tabName) {
      if (sh) return; // ya encontrado en la hoja primaria
      const cand = getTab(tabName, TAREAS_HEADERS);
      if (cand.getLastRow() < 2) return;
      const hit = cand.getRange(1, 1, cand.getLastRow(), 1)
        .createTextFinder(payload.taskId).matchEntireCell(true).findNext();
      if (hit) { sh = cand; rowNum = hit.getRow(); }
    });
    if (!sh) return json({ ok: false, error: 'Task not found' });

    const date = payload.deviceTimestamp ? new Date(payload.deviceTimestamp) : new Date();
    const stamp = Utilities.formatDate(date, TZ, 'yyyy-MM-dd_HHmm');
    const responsable = payload.responsable || sh.getRange(rowNum, 2).getValue();

    // Fotos opcionales -> Drive (subcarpeta según scope)
    let fotoUrl = '';
    if (payload.photos && payload.photos.length) {
      const ym = Utilities.formatDate(date, TZ, 'yyyy-MM');
      const carpetaBase = (payload.scope === 'management') ? 'Tareas Gerencia' : 'Tareas';
      const root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const folder = mkpath(root, [carpetaBase, ym, payload.taskId + '_' + stamp + '_' + responsable]);
      const urls = [];
      payload.photos.forEach(function (p, i) {
        const name = payload.taskId + '_foto' + (i + 1) + '.jpg';
        const blob = Utilities.newBlob(Utilities.base64Decode(p.dataBase64), p.mime || 'image/jpeg', name);
        urls.push(folder.createFile(blob).getUrl());
      });
      fotoUrl = urls.join(' , ');
    }

    // Actualizar la fila (col: estado=8, completadaEn=10, observaciones=11, fotoUrl=12)
    sh.getRange(rowNum, 8).setValue('completado');
    sh.getRange(rowNum, 10).setValue(new Date().toISOString());
    if (payload.observaciones) sh.getRange(rowNum, 11).setValue(payload.observaciones);
    if (fotoUrl) sh.getRange(rowNum, 12).setValue(fotoUrl);

    markAsProcessed(payload.submissionId, 'tarea:' + payload.taskId);
    return json({ ok: true, taskId: payload.taskId });
  } finally {
    lock.releaseLock();
  }
}

// Mueve tareas completadas con >7 días a la pestaña de archivo (ambas hojas).
function archivarTareas() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const archivo = getTab(ARCHIVO_TAB, TAREAS_HEADERS);
    const ahora = Date.now();
    const umbral = DIAS_ARCHIVO * 24 * 60 * 60 * 1000;

    TASK_TABS.forEach(function (tabName) {
      const src = getTab(tabName, TAREAS_HEADERS);
      const last = src.getLastRow();
      if (last < 2) return;

      const values = src.getRange(2, 1, last - 1, TAREAS_HEADERS.length).getValues();
      const paraArchivar = []; // { rowNum, row }
      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const estado = String(row[7] || '').toLowerCase().trim();
        const completadaEn = row[9];
        if (estado === 'completado' && completadaEn) {
          const ts = new Date(completadaEn).getTime();
          if (!isNaN(ts) && (ahora - ts) >= umbral) paraArchivar.push({ rowNum: i + 2, row: row });
        }
      }
      if (!paraArchivar.length) return;

      // Escribir en archivo en batch
      const filas = paraArchivar.map(function (x) { return x.row; });
      archivo.getRange(archivo.getLastRow() + 1, 1, filas.length, TAREAS_HEADERS.length).setValues(filas);

      // Borrar de origen de ABAJO hacia arriba (no correr índices)
      paraArchivar.sort(function (a, b) { return b.rowNum - a.rowNum; });
      paraArchivar.forEach(function (x) { src.deleteRow(x.rowNum); });

      Logger.log('Archivadas de ' + tabName + ': ' + paraArchivar.length);
    });
  } finally {
    lock.releaseLock();
  }
}

// Ejecutar UNA vez para programar el archivado diario (3am CR).
function instalarTriggerArchivo() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'archivarTareas') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('archivarTareas').timeBased().everyDays(1).atHour(3).create();
}

// Ejecutar UNA vez: crea la hoja Management con encabezados y validaciones (desplegables).
function setupManagement() {
  const sh = getTab(MANAGEMENT_TAB, TAREAS_HEADERS);

  // responsable (B): solo Alex por ahora (agregá nombres si crece gerencia)
  sh.getRange('B2:B').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Alex'], true).setAllowInvalid(false).build());

  // casa (C): opcional; celdas vacías permitidas, pero si se llena debe estar en la lista
  sh.getRange('C2:C').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Ceiba', 'Ron Ron', 'Mango', 'Palmera Azul'], true)
      .setAllowInvalid(false).build());

  // prioridad (F)
  sh.getRange('F2:F').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['normal', 'urgente'], true).setAllowInvalid(false).build());

  // estado (H)
  sh.getRange('H2:H').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['asignado', 'en progreso', 'completado'], true)
      .setAllowInvalid(false).build());

  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, TAREAS_HEADERS.length).setFontWeight('bold');
  Logger.log('Hoja Management lista con encabezados y validaciones.');
}

// ---------- Test ----------
function testDoPost() {
  const payload = {
    submissionId: 'test-' + Date.now(),
    casa: 'Casa Nube',
    checklistId: 'checkout',
    checklistLabel: 'Check-out · Salida',
    responsable: 'Nicole',
    deviceTimestamp: new Date().toISOString(),
    secret: SHARED_SECRET,
    answers: { co_basura: true, co_fotos: true },
    notes: 'Prueba',
    photos: []
  };
  const r = doPost({ postData: { contents: JSON.stringify(payload) } });
  Logger.log(r.getContent());
}
function testGetTareas() {
  const r = doPost({ postData: { contents: JSON.stringify({
    action: 'getTareas', responsable: 'Glen', secret: SHARED_SECRET
  })}});
  Logger.log(r.getContent());
}
function testGetTareasManagement() {
  const r = doPost({ postData: { contents: JSON.stringify({
    action: 'getTareasManagement', responsable: 'Alex', secret: SHARED_SECRET
  })}});
  Logger.log(r.getContent());
}
// Crea carpeta + fila de prueba con una foto dummy (imagen inválida, solo prueba el cableado).
function testGuardarGasto() {
  const r = doPost({ postData: { contents: JSON.stringify({
    action: 'guardarGasto',
    submissionId: 'gasto-test-' + Date.now(),
    responsable: 'Glen',
    casa: '',                 // opcional
    detalle: 'Prueba ferretería',
    monto: '12500',
    deviceTimestamp: new Date().toISOString(),
    secret: SHARED_SECRET,
    photos: [{ mime: 'image/jpeg', dataBase64: Utilities.base64Encode('dummy') }]
  })}});
  Logger.log(r.getContent());
}
// testGetInventario / testRetirarInventario viven en Inventario.gs