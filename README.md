# Arbórea Operaciones

Sistema offline-first para operaciones de limpieza y mantenimiento de Arbórea Experiences. PWA completa con formularios internos, captura de fotos, almacenamiento offline y sincronización automática con Google Drive.

Diseñada para uso en tablets rugosas en la Península de Osa, Costa Rica, con conectividad intermitente.

## Filosofía

Restraint radical. El espacio es el material primario. Márgenes amplios, contenido que nunca llena el contenedor, mayormente silencio. El ámbar es luz que aparece en momentos — nunca como relleno.

## Arquitectura

**Offline-first PWA** con sincronización bidireccional:

1. **Frontend (Next.js 14 + TypeScript)**
   - Formularios dinámicos desde esquemas JSON
   - IndexedDB para cola de submissions pendientes
   - Compresión de fotos en cliente (~1600px, JPEG 0.7)
   - Service Worker con cache-first strategy
   - Background Sync API para reintentos automáticos

2. **Backend (Google Apps Script)**
   - Web App que recibe submissions vía POST
   - Organiza en Drive: `Casa/Checklist/YYYY-MM/timestamp_responsable`
   - Idempotencia vía UUID v4
   - Opcional: registro en Google Sheets

## Funcionalidad

Navegación de tres pasos:

1. **Persona** — el personal selecciona su nombre
2. **Casa** — selecciona la residencia
3. **Checklist** — abre formulario interno con validación y fotos

### Sistema offline

- **Conexión disponible**: Guarda en IndexedDB y sincroniza inmediatamente
- **Sin conexión**: Guarda localmente, sincroniza cuando vuelva internet
- **Fotos**: Comprimidas antes de guardar (reduce tamaño 80-90%)
- **Cola persistente**: Contador de pendientes visible en UI

## Desarrollo local

### Setup inicial

1. Clonar repo e instalar dependencias:
```bash
npm install
```

2. Crear `.env.local` en la raíz:
```bash
NEXT_PUBLIC_BACKEND_URL=https://script.google.com/macros/s/ABC123.../exec
NEXT_PUBLIC_SHARED_SECRET=tu-secret-seguro-aqui
```

3. Ejecutar dev server:
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

**Nota**: Sin configurar el backend, los formularios se guardarán solo offline. Ver [apps-script/README.md](apps-script/README.md) para configurar el backend.

## Editar datos

### Personal y casas

[`src/config.ts`](src/config.ts):
- `people` — personal con nombre, rol (`limpieza` | `mant`) y subtítulo
- `houses` — residencias disponibles

### Checklists

[`src/checklists.ts`](src/checklists.ts) — 17 checklists completos:

**Limpieza (7):**
- Check-in, Check-out, Minibar, Repaso, Profunda, Anual, Inventario

**Mantenimiento (9):**
- Check-in, Check-out, Diario, Semanal, Mensual, Trimestral, Semestral, Anual, Inventario

**On-demand (1):**
- Incidencia

Cada checklist sigue el esquema `ChecklistSchema`:

```ts
interface ChecklistSchema {
  id: string;
  role: 'limpieza' | 'mant';
  label: string;
  icon: string;
  sections: { title: string; items: ChecklistItem[] }[];
  notes?: boolean;
  photos?: { max: number; required?: boolean };
}
```

Los formularios se renderizan automáticamente desde estos esquemas — no requieren código adicional para nuevos checklists.

## Build y despliegue

### 1. Deploy backend (Apps Script)

Ver instrucciones completas en [apps-script/README.md](apps-script/README.md):

1. Crear proyecto en [script.google.com](https://script.google.com)
2. Copiar código de `apps-script/Code.gs`
3. Configurar `SHARED_SECRET` y `DRIVE_FOLDER_ID`
4. Deploy como Web App (acceso: Anyone)
5. Copiar la URL del Web App generada

### 2. Build frontend

```bash
npm run build
```

Genera export estático en `out/`. Verificar que no haya errores de tipos ni warnings.

### 3. Deploy frontend (Vercel)

1. Conectar repo en [vercel.com](https://vercel.com)
2. Framework Preset: **Next.js**
3. Build command: `npm run build`
4. Output directory: `out`
5. **Environment Variables:**
   - `NEXT_PUBLIC_BACKEND_URL`: La URL del Apps Script Web App
   - `NEXT_PUBLIC_SHARED_SECRET`: El mismo secret configurado en Apps Script
6. En Settings → Domains, añadir `operaciones.arboreaexperiences.com`
7. Configurar CNAME en DNS apuntando a Vercel

### Alternativa: Hostinger u otro hosting estático

El `out/` generado es HTML/CSS/JS estático — puede servirse desde cualquier host:

```bash
# Subir contenido de out/ vía FTP/SFTP
# o usar CLI de Hostinger si está disponible
```

## Marca

- **Colores:** Forest `#222E2C` (fondo), Amber `#FFD2A9` (acentos), Paper `#F0EBE4` (texto)
- **Tipografía:** Helvetica Neue (estructura), Inter (tranquila), Fraunces (viva, itálica)
- **Logo:** nunca modificar — no recolorear, estirar, rotar ni añadir efectos

## Accesibilidad

- Targets táctiles ≥82px para manos ocupadas
- Alto contraste Paper sobre Forest
- Foco de teclado visible (ámbar)
- `prefers-reduced-motion` respetado

## PWA

Instalable en home screen de iOS/Android. Características:

- **Service Worker**: Cache-first para app shell, funciona 100% offline
- **IndexedDB**: Cola persistente de submissions pendientes
- **Background Sync**: Reintenta automáticamente cuando vuelve conexión
- **Compresión inteligente**: Fotos optimizadas antes de guardar
- **Persistencia**: Recuerda última persona seleccionada

## Estructura del proyecto

```
arborea-ops/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── checklist/[id]/     # Ruta dinámica para formularios
│   │   ├── layout.tsx          # Layout principal + metadata PWA
│   │   └── page.tsx            # Navegación 3 pasos
│   ├── components/
│   │   ├── ChecklistForm.tsx   # Renderizador universal de formularios
│   │   └── RegisterSW.tsx      # Registro de service worker
│   ├── lib/
│   │   ├── offline-storage.ts  # Wrapper de IndexedDB
│   │   ├── photo-compression.ts # Compresión de imágenes
│   │   └── sync.ts             # Sincronización con backend
│   ├── checklists.ts           # 17 esquemas de checklists
│   └── config.ts               # Personal, casas, tipos
├── apps-script/
│   ├── Code.gs                 # Backend Apps Script
│   └── README.md               # Instrucciones de deploy
├── public/
│   ├── sw.js                   # Service worker manual
│   └── manifest.json           # PWA manifest
└── README.md                   # Este archivo
```

## Tecnologías

- **Next.js 14** (App Router, TypeScript)
- **IndexedDB** (vía API nativa)
- **Service Worker API** + Background Sync
- **Canvas API** (compresión de imágenes)
- **Google Apps Script** (backend serverless)
- **Google Drive API** (almacenamiento de fotos)

## Limitaciones conocidas

- **Photos en iOS Safari**: `capture="environment"` no siempre fuerza cámara trasera
- **Background Sync**: No disponible en iOS (fallback: sync manual al abrir app)
- **IndexedDB quota**: ~50MB en modo privado, usuarios deben permitir almacenamiento
- **Apps Script timeout**: 6 min máximo (suficiente para 10 fotos comprimidas)

---

**Arbórea Experiences** — donde el bosque respira
