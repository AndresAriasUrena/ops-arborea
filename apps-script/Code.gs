/**
 * Arbórea Operations — Backend Apps Script (endurecido)
 * Reemplaza el contenido completo de Código.gs por esto.
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
// ====================================================

function doGet() {
  return json({ ok: true, service: 'arborea-ops', ts: new Date().toISOString() });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    if (payload.secret !== SHARED_SECRET) return json({ ok: false, error: 'Unauthorized' });
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

function getTab(name, headers) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0 && headers) sh.appendRow(headers);
  return sh;
}

// ContentService SIEMPRE responde 200; el cliente debe leer body.ok (no el status HTTP).
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
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
