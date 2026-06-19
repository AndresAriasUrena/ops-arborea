# Apps Script Backend - Arbórea Operations (Endurecido)

Este backend recibe submissions del PWA, guarda las fotos en Google Drive y registra los datos en Google Sheets.

**Características del backend endurecido:**
- **LockService**: Previene duplicados cuando múltiples tablets sincronizan simultáneamente
- **Idempotencia escalable**: Usa pestaña Log (sin límite de 500KB del PropertiesService)
- **Subcarpeta por envío**: Cada submission tiene su propia carpeta con timestamp
- **Timezone**: Costa Rica (America/Costa_Rica) para carpetas y archivos
- **Sheet conectado**: ID real configurado, índice automático en pestaña Submissions

## Estructura de carpetas en Drive

Cada submission crea su propia subcarpeta con timestamp:

```
Arbórea Operations/
  ├── Casa Nube/
  │   ├── Check-out · Salida/
  │   │   ├── 2025-01/
  │   │   │   ├── 2025-01-15_1430_Nicole/
  │   │   │   │   ├── 2025-01-15_1430_Nicole_foto1.jpg
  │   │   │   │   ├── 2025-01-15_1430_Nicole_foto2.jpg
  │   │   │   │   └── 2025-01-15_1430_Nicole_data.json
  │   │   │   └── 2025-01-15_1645_Denisa/
  │   │   └── 2025-02/
  │   └── Mantenimiento Semanal/
  ├── Casa Mango/
  └── Palmera Azul/
```

## Instrucciones de Deploy

### 1. Crear proyecto Apps Script

1. Ve a [script.google.com](https://script.google.com)
2. Crea un nuevo proyecto
3. Nómbralo "Arbórea Operations Backend"
4. Copia el contenido de `Code.gs` al editor

### 2. Configurar variables

Edita las constantes al inicio de Code.gs:

```javascript
const SHARED_SECRET  = 'arborea2025secure'; // = NEXT_PUBLIC_SHARED_SECRET
const DRIVE_FOLDER_ID = '1_80rGUDaavK1IKzg7hdpc1s4DlzWjOzf';
const SHEET_ID = '1v6x9KTFCT9Cjk9wEpd0PzEK0J4eCnC3LwDmH0JNnLDE';
const TZ = 'America/Costa_Rica';
```

**⚠️ DRIVE_FOLDER_ID - Copiar con cuidado:**
1. Crea una carpeta en Google Drive llamada "Arbórea Operations"
2. Abre la carpeta en el navegador
3. Copia el ID de la URL: `https://drive.google.com/drive/folders/1_80rGUDaavK1IKzg7hdpc1s4DlzWjOzf`
4. **Cuidado con caracteres similares**: l (ele minúscula) vs I (i mayúscula), 0 (cero) vs O (o mayúscula)
5. Si `testDoPost()` dice "not found", el ID está mal

**SHEET_ID:**
1. Abre el Google Sheet "Registro Checklists"
2. Copia el ID de la URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
3. El sheet debe tener permisos para la cuenta operations@arboreaexperiences.com

**SHARED_SECRET:**
- Debe coincidir **exactamente** con `NEXT_PUBLIC_SHARED_SECRET` en `.env.local` del PWA
- Usa un valor seguro (mínimo 16 caracteres aleatorios)

### 3. Verificar configuración del Sheet

El Sheet ya está conectado y activo. Se crearán automáticamente dos pestañas:

**Pestaña "Submissions"** (índice principal):
- serverTimestamp, deviceTimestamp, casa, checklist, responsable
- answers (JSON), notes, fotos, folderUrl, submissionId

**Pestaña "Log"** (idempotencia):
- submissionId, folderUrl, serverTimestamp
- Usada para detectar duplicados (escala sin límite de 500KB)

No requiere configuración adicional - las pestañas se crean automáticamente en el primer envío.

### 4. Deploy como Web App

1. En el editor, click en **Deploy** → **New deployment**
2. Configuración:
   - **Type**: Web app
   - **Description**: v1 - Initial deployment
   - **Execute as**: Me (tu cuenta)
   - **Who has access**: Anyone
3. Click **Deploy**
4. Autoriza los permisos necesarios:
   - Ver y gestionar archivos de Drive
   - (Si usas Sheets) Ver y gestionar hojas de cálculo
5. Copia la **Web app URL** que se genera

### 5. Configurar frontend

Crea un archivo `.env.local` en la raíz del proyecto Next.js:

```bash
NEXT_PUBLIC_BACKEND_URL=https://script.google.com/macros/s/ABC123.../exec
NEXT_PUBLIC_SHARED_SECRET=arborea2025secure
```

Reemplaza con:
- La URL real del Web App
- El mismo SHARED_SECRET que configuraste en Apps Script

### 6. Testing

Puedes probar el backend directamente desde Apps Script:

1. En el editor, selecciona la función `testDoPost`
2. Click en **Run**
3. Revisa los logs (View → Logs)
4. Verifica que se creó la carpeta y archivos en Drive

### 7. Redeploy (actualizaciones futuras)

Cuando hagas cambios al código:

1. Guarda los cambios
2. Click en **Deploy** → **Manage deployments**
3. Click en el ícono de editar (lápiz) del deployment activo
4. Cambia **Version** a "New version"
5. Actualiza la descripción (ej: "v2 - Fixed photo compression")
6. Click **Deploy**

**Importante**: La URL del Web App NO cambia, así que no necesitas actualizar el frontend.

## Debugging

Si algo falla:

1. **Ver logs**: En el editor Apps Script → View → Logs
2. **Executions**: View → Executions (muestra todas las ejecuciones recientes)
3. **Test local**: Usa la función `testDoPost()` para probar sin el frontend

### Errores comunes

- **Unauthorized**: SHARED_SECRET no coincide
- **Missing required fields**: El payload del frontend está incompleto
- **Drive error**: DRIVE_FOLDER_ID incorrecto o sin permisos
- **CORS**: El Web App debe estar configurado como "Anyone" (no "Anyone with the link")

## Monitoreo

El sistema tiene tres capas de idempotencia:

1. **Cache (6 horas)**: Respuestas rápidas para reintentos inmediatos
2. **Pestaña Log**: Persistencia escalable de submissionIds procesados (sin límite)
3. **LockService**: Serializa el procesamiento cuando múltiples tablets sincronizan a la vez

Esto previene duplicados incluso cuando toda la flota descarga su cola offline simultáneamente.

## Límites de Apps Script

- Máximo 30 MB por archivo en Drive (suficiente para 10 fotos comprimidas)
- Máximo 6 minutos de ejecución por request
- LockService: timeout de 30 segundos para adquirir lock
- Quota diaria: 20,000 ejecuciones (más que suficiente para operaciones)

## Seguridad

- El SHARED_SECRET provee autenticación básica
- Las submissions incluyen submissionId único (idempotencia)
- Los datos se guardan en la cuenta operations@arboreaexperiences.com
- Solo esa cuenta tiene acceso a Drive y Sheets
