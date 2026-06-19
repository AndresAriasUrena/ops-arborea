# Guía de Testing - Arbórea Operations

## Testing end-to-end: Offline → Online

### Requisitos previos

1. ✅ Backend Apps Script deployado y URL configurada
2. ✅ `.env.local` con `NEXT_PUBLIC_BACKEND_URL` y `NEXT_PUBLIC_SHARED_SECRET`
3. ✅ App desplegada en producción (Vercel/Hostinger) o corriendo localmente
4. ✅ Acceso a una tablet o Chrome DevTools con emulación de red

### Escenario de prueba completo

#### 1. Preparación (Online)

1. Abrir la app en el navegador
2. Abrir DevTools → Application → Storage
3. Verificar que IndexedDB "arborea-ops" exista (se crea automáticamente)
4. Abrir DevTools → Console para ver logs

#### 2. Crear submission OFFLINE

1. **Desconectar red**: DevTools → Network → Offline
2. Navegar: Persona → Casa → Checklist
3. Llenar el formulario completo:
   - Marcar checkboxes
   - Ingresar números
   - Seleccionar opciones
   - Escribir notas
   - **Importante**: Tomar 2-3 fotos
4. Click "Enviar checklist"
5. **Verificar**:
   - Mensaje: "Guardado offline (1 pendiente)"
   - Badge ámbar con "1" aparece en header
   - No errores en Console

#### 3. Verificar almacenamiento offline

1. DevTools → Application → IndexedDB → arborea-ops → submissions
2. Verificar el registro:
   - `submissionId`: UUID v4
   - `status`: "pending"
   - `photos`: Array con `{ name, mime, dataBase64 }`
   - `answers`: Objeto con respuestas
   - `deviceTimestamp`: ISO timestamp

#### 4. Reconectar y verificar sync automático

1. **Reconectar red**: DevTools → Network → Online
2. **Debe suceder automáticamente**:
   - Console log: "Sincronizando..."
   - Badge debe bajar a 0 (desaparecer)
   - Si no sucede automático: refrescar página

3. **Verificar en Console**:
   ```
   Sincronizando...
   ✓ Synced 1 submission(s)
   ```

#### 5. Verificar en backend (Drive + Sheet)

1. **Google Drive**:
   ```
   Arbórea Operations/
     Casa Nube/  (o la casa seleccionada)
       Check-out · Salida/  (o el checklist usado)
         2025-06/
           2025-06-18_1430_Nicole/
             ├── 2025-06-18_1430_Nicole_foto1.jpg
             ├── 2025-06-18_1430_Nicole_foto2.jpg
             └── 2025-06-18_1430_Nicole_data.json
   ```

2. **Google Sheet "Registro Checklists"**:
   - Pestaña **Submissions**: Verificar nueva fila con datos
   - Pestaña **Log**: Verificar submissionId registrado

3. **Verificar data.json**:
   - Abrir el archivo desde Drive
   - Debe contener: answers, notes, photoUrls, timestamps

#### 6. Verificar idempotencia (opcional)

1. DevTools → Application → IndexedDB
2. Cambiar manualmente el status de la submission de vuelta a "pending"
3. Refrescar página para disparar sync
4. **Debe**:
   - Sincronizar sin error
   - Backend responder con `{ ok: true, dedup: true }`
   - NO crear carpeta duplicada en Drive
   - Console log: "Deduplicado: [submissionId]"

### Escenarios adicionales

#### Prueba de concurrencia

1. Crear 3 submissions offline
2. Badge debe mostrar "3"
3. Reconectar
4. Verificar que las 3 se sincronicen sin duplicados
5. Verificar 3 carpetas separadas en Drive (con timestamps diferentes)

#### Prueba de Background Sync (Chrome Android/Desktop)

1. Crear submission offline
2. Cerrar pestaña/app
3. Reconectar red
4. Esperar 10-30 segundos (Background Sync activa automáticamente)
5. Abrir app nuevamente
6. Badge debe estar en 0

#### Prueba de error de red

1. Modificar `NEXT_PUBLIC_BACKEND_URL` a una URL inválida
2. Crear submission offline
3. Reconectar
4. **Debe**:
   - Console log: "Error al sincronizar: [error]"
   - Submission permanecer en status "pending"
   - Badge seguir mostrando "1"
   - NO marcar como synced

### Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| Badge no aparece | getPendingCount falla | Verificar IndexedDB en DevTools |
| "BACKEND_URL no configurado" | .env.local faltante | Crear .env.local con variables |
| "Unauthorized" | SHARED_SECRET no coincide | Verificar que sean idénticos en frontend y Code.gs |
| Fotos no suben | Conversión base64 falla | Verificar que photos sea Array de objetos con dataBase64 |
| Carpeta duplicada | Idempotencia no funciona | Verificar pestaña Log en Sheet |
| CORS error | Web App mal configurado | Deploy debe ser "Anyone", no "Anyone with the link" |

### Checklist de verificación completa

- [ ] Submission se guarda offline sin errores
- [ ] Badge muestra contador correcto
- [ ] Fotos se comprimen (verificar tamaño <500KB cada una)
- [ ] Sync automático al reconectar
- [ ] Badge baja a 0 después de sync
- [ ] Carpeta creada en Drive con estructura correcta
- [ ] Fotos visibles en Drive
- [ ] data.json contiene toda la información
- [ ] Fila creada en Sheet "Submissions"
- [ ] submissionId en pestaña "Log"
- [ ] Reintento no crea duplicados (idempotencia)
- [ ] Build estático sin errores (`npm run build`)

## Testing en tablet real

### Preparación

1. Acceder a `operaciones.arboreaexperiences.com` desde tablet
2. Instalar PWA: Safari → Compartir → "Agregar a pantalla de inicio"
3. Abrir la PWA instalada (pantalla completa, sin barra de navegación)

### Prueba de campo

1. **Zona sin cobertura**:
   - Llenar checklist completo con 3+ fotos
   - Verificar mensaje "Guardado offline"
   - Verificar badge visible

2. **Volver a zona con WiFi**:
   - Abrir PWA
   - Esperar auto-sync (10-30 segundos)
   - Badge debe desaparecer

3. **Verificación desde oficina**:
   - Revisar Drive y Sheet
   - Confirmar que todas las fotos subieron
   - Validar que data.json esté completo

### Notas importantes

- **iOS Safari**: Background Sync no disponible, pero sync manual al abrir app funciona
- **Modo privado**: IndexedDB puede tener cuota reducida (~50MB)
- **Permisos de cámara**: Primera vez pedirá permiso, recordar aceptar
- **Formato de fotos**: JPEG comprimido, máximo 10 por checklist

## Plan B: Proxy Vercel (si CORS falla)

Si en producción el navegador no puede leer la respuesta JSON del Apps Script (302 redirect issue):

1. Crear `src/app/api/sync/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL!; // Sin NEXT_PUBLIC_
const SHARED_SECRET = process.env.SHARED_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.json();

  const response = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ ...body, secret: SHARED_SECRET }),
  });

  const result = await response.json();
  return NextResponse.json(result);
}
```

2. Actualizar `sync.ts`:
```typescript
const BACKEND_URL = '/api/sync'; // En lugar de process.env
```

3. Mover secrets a variables de entorno del servidor (sin NEXT_PUBLIC_)

**Trade-off**: App deja de ser export estático (requiere Vercel runtime).
