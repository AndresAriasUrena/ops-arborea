# Arbórea Operations - Project Memory

## Información General

**Proyecto:** Arbórea Operations PWA
**Propósito:** Sistema offline-first para gestión de checklists de operaciones de Arbórea Experiences
**Tecnología:** Next.js 14 App Router + Google Apps Script backend
**Estado:** ✅ Funcional con UI/UX premium completada
**Deploy:** ops.arboreaexperiences.com

## Arquitectura del Sistema

### Frontend (Next.js PWA)
- **Framework:** Next.js 14 con App Router
- **Export:** Estático (`output: 'export'`)
- **Offline-First:** Service Worker + IndexedDB + Background Sync API
- **Compresión de fotos:** Client-side (1600px max, JPEG 0.7 quality)
- **Mobile-First:** Touch-optimized, high contrast para uso exterior

### Backend (Google Apps Script)
- **Endpoint:** Web App deployado como "Anyone"
- **Storage:** Google Drive (carpetas por envío) + Google Sheets (registro)
- **Idempotencia:** Cache (6h) + Log sheet + LockService
- **Timezone:** America/Costa_Rica

### Estructura de Carpetas en Drive
```
Arbórea Operations/
  ├── Casa Nube/
  │   ├── Check-in · Preparación/
  │   │   └── 2025-06/
  │   │       └── 2025-06-18_1430_Nicole/
  │   │           ├── 2025-06-18_1430_Nicole_foto1.jpg
  │   │           └── 2025-06-18_1430_Nicole_data.json
  │   ├── Check-out · Salida/
  │   └── Mantenimiento Semanal/
  ├── Casa Mango/
  └── Palmera Azul/
```

## Diseño UI/UX

### Filosofía: "Restraint Radical"
- Espacio como material primario
- Paleta limitada (5-6 colores principales)
- Tipografía restringida (Helvetica Neue/Inter)
- Transiciones sutiles (≤0.3s)
- SVG minimalista (stroke only, no fill)
- Alto contraste para legibilidad exterior

### Paleta de Colores
```css
--forest: #222E2C        (fondo principal)
--forest-deep: #161D1C   (fondo profundo)
--canopy: #345B49        (verde bosque)
--canopy-deep: #213B2F   (verde oscuro)
--moss: #D8DDB8          (beige claro)
--amber: #FFD2A9         (interacciones)
--paper: #F0EBE4         (texto principal)
--sand: #D6CFC5          (texto secundario)
--slate: #7D8584         (terciario)
--surface: #27322F       (superficies)
--border: #3A4744        (bordes)
```

### Tipografía
- **Structural:** Helvetica Neue (botones, headers)
- **Quiet:** Inter (formularios, body text)
- **Living:** Fraunces italic (footer, detalles)

### Medidas Touch-Friendly
- Botones: `min-height: 82px`
- Checkboxes: `28px × 28px`
- Touch targets: `≥44px` (iOS HIG)
- Font-size inputs: `16px` (evita zoom iOS)
- Photo grid: `minmax(140px, 1fr)`

## Archivos Clave

### Configuración
- **`.env.local`**: Backend URL + shared secret
- **`next.config.ts`**: Export estático, imagen optimization
- **`src/config.ts`**: Personas, casas, tipos de checklist
- **`src/checklists.ts`**: Definiciones de todos los checklists

### Frontend Core
- **`src/app/page.tsx`**: Homepage (persona → casa → checklist)
- **`src/app/checklist/[id]/page.tsx`**: Server component (generateStaticParams)
- **`src/app/checklist/[id]/client-page.tsx`**: Client component (form logic)
- **`src/components/ChecklistForm.tsx`**: Formulario universal

### Offline System
- **`src/lib/offline-storage.ts`**: IndexedDB wrapper
- **`src/lib/sync.ts`**: Sync logic con guard de concurrencia
- **`src/lib/photo-compression.ts`**: Compresión client-side
- **`public/sw.js`**: Service Worker manual

### UI Components
- **`src/lib/icons.tsx`**: Sistema de iconos SVG profesionales
- **`src/app/globals.css`**: Sistema de diseño completo

### Backend
- **`apps-script/Code.gs`**: Backend completo con idempotencia

## Flujo de Datos

### Offline → Online
1. Usuario llena checklist offline
2. Datos guardados en IndexedDB (status: "pending")
3. Badge muestra contador de pendientes
4. Al reconectar: auto-sync via `syncAllPending()`
5. Backend verifica idempotencia (Log sheet)
6. Carpeta creada en Drive + registro en Sheet
7. Status cambia a "synced", badge desaparece

### Idempotencia (3 capas)
1. **Cache (6h):** Respuestas rápidas para reintentos inmediatos
2. **Log sheet:** Persistencia escalable de submissionIds
3. **LockService:** Serializa procesamiento concurrente

## Variables de Entorno

```bash
NEXT_PUBLIC_BACKEND_URL=https://script.google.com/macros/s/.../exec
NEXT_PUBLIC_SHARED_SECRET=arborea2025secure
```

## Deployment

### Frontend (Vercel/Hostinger)
```bash
npm run build  # Genera carpeta out/ con 21 páginas estáticas
```

### Backend (Apps Script)
1. Deploy como Web App ("Anyone")
2. Configurar IDs en Code.gs:
   - `DRIVE_FOLDER_ID`
   - `SHEET_ID`
   - `SHARED_SECRET`

## Checklists Disponibles

### Check-in (Preparación)
- Recepción huéspedes
- Repaso habitación
- Preparación experiencias

### Check-out (Salida)
- Revisión final
- Inventario amenities
- Fotografías de entrega

### Mantenimiento
- Semanal
- Mensual
- Piscina
- Jardines

### Inventario
- Minibar
- Amenities
- Blancos

## Usuarios del Sistema

### Personas
- **Nicole** (Operaciones)
- **Andres** (Mantenimiento)
- **Denisa** (Limpieza)

### Casas
- Casa Nube
- Casa Mango
- Palmera Azul
- Casa Árbol
- Casa Luna

## Testing

### Local
```bash
npm run dev  # http://localhost:3000
```

### Testing Offline
1. DevTools → Network → Offline
2. Crear submission
3. Verificar badge y mensaje "Guardado offline"
4. Network → Online
5. Auto-sync y badge desaparece

### Validación
- ✅ Build estático: 21 páginas
- ✅ Iconos SVG profesionales
- ✅ Logo centrado
- ✅ Botones touch-friendly (82px)
- ✅ Alto contraste WCAG AA
- ✅ Checkboxes horizontales (derecha)
- ✅ Botones formulario 50/50 width
- ✅ Photo grid responsive

## Problemas Resueltos

1. **Emoticones baratos** → SVG profesionales en `icons.tsx`
2. **Logo descentrado** → CSS text-align center + margin auto
3. **Botones pequeños** → min-height 82px, padding 20px 18px
4. **Bajo contraste** → Paleta optimizada para luz solar
5. **Checkbox layout** → Horizontal con checkbox a la derecha
6. **Overflow botones** → min-width: 0, text-overflow: ellipsis
7. **Photo button bajo contraste** → Background canopy green
8. **Botones formulario** → flex: 1 en ambos (50/50 split)

## Próximos Pasos (Opcional)

- [ ] Añadir campo "hora inicio/fin" en formularios
- [ ] Panel admin para revisar submissions
- [ ] Exportar submissions a PDF
- [ ] Notificaciones automáticas en Sheet
- [ ] Dashboard con estadísticas

## Notas Importantes

⚠️ **No editar archivos .pen con Read/Grep** - usar solo herramientas MCP pencil
⚠️ **Service Worker requiere HTTPS** en producción
⚠️ **Background Sync no disponible en iOS Safari** - sync manual al abrir app
⚠️ **SHARED_SECRET debe coincidir** entre frontend y backend
⚠️ **Web App debe ser "Anyone"** no "Anyone with the link" (CORS)

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Ver estructura build
ls -R out/

# Testing offline storage
# DevTools → Application → IndexedDB → arborea-ops

# Ver logs Service Worker
# DevTools → Application → Service Workers → Console
```

## Contacto y Recursos

- **Documentación:** DEPLOYMENT.md, TESTING.md
- **Backend README:** apps-script/README.md
- **Plan UI/UX:** ~/.claude/plans/glowing-shimmying-sky.md
- **Repository:** (pendiente de configurar remote)

---

**Última actualización:** 2025-06-18
**Versión:** 1.0.0 (UI/UX Redesign Complete)
**Estado:** Production Ready ✅
