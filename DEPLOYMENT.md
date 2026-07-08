# Deployment Guide - Arbórea Operations

## Pre-deployment Checklist

- [ ] Verificar `.env.local` con backend URL correcto
- [ ] `npm run build` sin errores (22 páginas)
- [ ] Test offline/online funcionando
- [ ] Verificar contraste botón "Mis pendientes"

## Build

```bash
npm run build
# Genera carpeta out/ con 22 páginas
```

## Hostinger Deployment

### Archivos a subir (carpeta `out/`)

```
out/
├── .htaccess          ← IMPORTANTE
├── index.html
├── tarea.html         ← Ruta fija (no [id])
├── checklist/
│   ├── checkin.html
│   ├── checkout.html
│   └── ... (17 archivos)
├── _next/             ← Assets
├── manifest.json
├── sw.js
└── *.png             ← Icons PWA
```

### Pasos

1. **FTP a Hostinger** (FileZilla/Cyberduck)
2. **Directorio:** `/public_html/ops/`
3. **Limpiar todo** (backup primero)
4. **Subir contenido de `out/`**
5. **Verificar `.htaccess` existe**

## Verificación

- ✅ https://ops.arboreaexperiences.com/
- ✅ https://ops.arboreaexperiences.com/tarea
- ✅ Service Worker registrado
- ✅ Test offline → Guardar checklist
- ✅ Botón "Mis pendientes" color amber
- ✅ Expandir tareas inline
- ✅ Abrir tarea → /tarea (no 404)

## .htaccess Crítico

El archivo `out/.htaccess` ya está creado con:
- Rewrite rules para `/tarea` → `tarea.html`
- Cache headers para assets
- Service Worker sin cache
- HTTPS forzado

**No olvidar subir `.htaccess`** (archivos ocultos)

## Troubleshooting

**404 en /tarea:**
→ Verificar `.htaccess` subido
→ Contactar Hostinger para habilitar mod_rewrite

**Service Worker no funciona:**
→ Requiere HTTPS (forzado en .htaccess)

**Tareas no abren:**
→ Verificar `tarea.html` existe en raíz
