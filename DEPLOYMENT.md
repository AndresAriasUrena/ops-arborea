# Guía de Deployment Rápida - Arbórea Operations

## Estado Actual

✅ Frontend completado y funcionando localmente
✅ Build estático verificado (21 páginas)
⏳ Backend Apps Script pendiente de deploy
⏳ Variables de entorno pendientes de configurar

## Pasos para Deploy Completo

### 1. Deploy Backend Apps Script (15 minutos)

#### A. Crear proyecto

1. Ir a [script.google.com](https://script.google.com)
2. Nuevo proyecto → "Arbórea Operations Backend"
3. Copiar todo el contenido de `apps-script/Code.gs`
4. Pegar en el editor (reemplazar contenido default)

#### B. Configurar IDs

Editar las constantes al inicio del archivo:

```javascript
const SHARED_SECRET = 'arborea2025secure';  // Cambiar por algo más seguro
const DRIVE_FOLDER_ID = 'PONER_ID_AQUI';
const SHEET_ID = 'PONER_ID_AQUI';
```

**Obtener DRIVE_FOLDER_ID:**
1. Ir a [drive.google.com](https://drive.google.com)
2. Crear carpeta "Arbórea Operations" (o abrir existente)
3. Abrir la carpeta
4. Copiar ID de la URL: `https://drive.google.com/drive/folders/1_80rGUDaavK1IKzg7hdpc1s4DlzWjOzf`
5. El ID es: `1_80rGUDaavK1IKzg7hdpc1s4DlzWjOzf`
6. ⚠️ **CUIDADO**: l (ele) vs I (i mayúscula), 0 (cero) vs O

**Obtener SHEET_ID:**
1. Abrir Google Sheets "Registro Checklists" (o crear nuevo)
2. Copiar ID de la URL: `https://docs.google.com/spreadsheets/d/1v6x9KTFCT9Cjk9wEpd0PzEK0J4eCnC3LwDmH0JNnLDE/edit`
3. El ID es: `1v6x9KTFCT9Cjk9wEpd0PzEK0J4eCnC3LwDmH0JNnLDE`

#### C. Probar localmente

1. En el editor, seleccionar función `testDoPost`
2. Click **Run** (▶️)
3. Autorizar permisos (Drive + Sheets)
4. Revisar **View → Logs**
5. Debe mostrar: `{"ok":true,"submissionId":"test-...","folderUrl":"..."}`
6. Verificar carpeta creada en Drive

#### D. Deploy como Web App

1. Click **Deploy** → **New deployment**
2. Configurar:
   - Type: **Web app**
   - Description: `v1 - Initial deployment`
   - Execute as: **Me** (operations@arboreaexperiences.com)
   - Who has access: **Anyone**  ← ⚠️ IMPORTANTE
3. Click **Deploy**
4. **Copiar la URL** que aparece (termina en `/exec`)

Ejemplo URL:
```
https://script.google.com/macros/s/AKfycbxAbC123...XyZ/exec
```

### 2. Configurar Frontend Local

Editar `.env.local` en la raíz del proyecto:

```bash
# Pegar la URL del paso anterior
NEXT_PUBLIC_BACKEND_URL=https://script.google.com/macros/s/AKfycbx.../exec

# Mismo secret que en Code.gs
NEXT_PUBLIC_SHARED_SECRET=arborea2025secure
```

**Reiniciar dev server:**
```bash
# Ctrl+C para detener
npm run dev
```

### 3. Testing Local (5 minutos)

1. Abrir [http://localhost:3000](http://localhost:3000)
2. Navegar: Persona → Casa → Checklist
3. **Llenar formulario completo** (todos los campos requeridos)
4. **Tomar 2-3 fotos** (importante para probar compresión)
5. Click "Enviar checklist"
6. Debe mostrar: "Checklist enviado correctamente" ✅

**Verificar en Drive:**
```
Arbórea Operations/
  Casa Nube/ (o la casa seleccionada)
    Check-in · Preparación/ (o el checklist usado)
      2025-06/
        2025-06-18_1430_Nicole/
          ├── 2025-06-18_1430_Nicole_foto1.jpg
          ├── 2025-06-18_1430_Nicole_foto2.jpg
          └── 2025-06-18_1430_Nicole_data.json
```

**Verificar en Sheet:**
- Pestaña "Submissions": Nueva fila con datos
- Pestaña "Log": submissionId registrado

### 4. Deploy Frontend a Producción

#### Opción A: Vercel (Recomendado - 10 minutos)

1. Ir a [vercel.com](https://vercel.com)
2. Importar proyecto desde GitHub
3. Configurar:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `out`
4. **Environment Variables** (⚠️ CRÍTICO):
   ```
   NEXT_PUBLIC_BACKEND_URL = https://script.google.com/macros/s/.../exec
   NEXT_PUBLIC_SHARED_SECRET = arborea2025secure
   ```
5. Click **Deploy**
6. Esperar ~2 minutos
7. Copiar URL generada (ej: `arborea-ops.vercel.app`)

**Configurar dominio custom:**
1. Settings → Domains
2. Añadir: `operaciones.arboreaexperiences.com`
3. Configurar DNS (CNAME):
   ```
   operaciones → cname.vercel-dns.com
   ```

#### Opción B: Hostinger (Manual - 15 minutos)

```bash
# 1. Build local
npm run build

# 2. Subir contenido de out/ vía FTP/SFTP
# Host: ftp.arboreaexperiences.com
# Usuario: [tu usuario]
# Directorio: /public_html/operaciones/

# 3. Configurar variables de entorno
# En Hostinger Panel → Variables de entorno (si disponible)
# O crear archivo .env.production en el servidor
```

### 5. Testing en Producción

#### A. Prueba Online

1. Abrir `operaciones.arboreaexperiences.com` (o URL de Vercel)
2. **Instalar PWA**: Safari → Compartir → "Agregar a pantalla de inicio"
3. Crear submission completo con fotos
4. Verificar en Drive + Sheet

#### B. Prueba Offline

1. DevTools → Network → **Offline**
2. Crear submission (debe mostrar "Guardado offline (1 pendiente)")
3. Badge ámbar con "1" visible en header
4. DevTools → Network → **Online**
5. Esperar 10-30 segundos (auto-sync)
6. Badge debe desaparecer
7. Verificar en Drive

## Troubleshooting

### "BACKEND_URL no configurado"

- Verificar que `.env.local` existe
- Reiniciar `npm run dev`
- En producción: verificar Environment Variables en Vercel

### "Unauthorized"

- `SHARED_SECRET` no coincide entre Code.gs y `.env.local`
- Deben ser **idénticos** (case-sensitive)

### "CORS error" o "Failed to fetch"

- Web App debe estar en modo "Anyone", NO "Anyone with the link"
- Redeploy si es necesario

### Fotos no suben

- Verificar que se toman fotos (preview visible)
- Abrir DevTools → Console (ver errores de compresión)
- Verificar que DRIVE_FOLDER_ID es correcto

### Badge no baja a 0

- Abrir DevTools → Console
- Buscar: "Sync ya en progreso" o "Error al sincronizar"
- Verificar conexión a internet
- Refrescar página manualmente

### Carpetas duplicadas en Drive

- Normal si múltiples tablets sincronizan a la vez
- LockService previene duplicados del MISMO submission
- Cada submission legítimo crea su propia carpeta

## Checklist Final

Antes de entregar a usuarios:

- [ ] Backend deployado y testDoPost funciona
- [ ] Frontend deployado (Vercel o Hostinger)
- [ ] Environment variables configuradas
- [ ] Testing online exitoso (submission llega a Drive)
- [ ] Testing offline exitoso (badge funciona, sync automático)
- [ ] PWA instalable (manifest.json + service worker)
- [ ] Dominio custom configurado
- [ ] Pestañas Log y Submissions en Sheet
- [ ] Permisos correctos en Drive y Sheet
- [ ] SHARED_SECRET cambiado a valor seguro

## Próximos Pasos Opcionales

### Si CORS falla en producción

Implementar Plan B (proxy Vercel) - Ver [TESTING.md](TESTING.md:334)

### Monitoreo

- Configurar notificaciones en Sheet (Apps Script triggers)
- Dashboard con stats de submissions
- Alertas por submissions con errores

### Mejoras

- Añadir campo "hora de inicio/fin" en formularios
- Exportar submissions a PDF
- Panel admin para revisar submissions
