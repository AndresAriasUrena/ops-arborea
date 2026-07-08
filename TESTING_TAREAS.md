# Testing - Módulo de Tareas Extra

## Estado del Backend

El módulo de tareas extra está implementado en el frontend y listo para integrarse con el backend de Google Apps Script. Sin embargo, el backend aún necesita implementar los siguientes endpoints:

### 1. getTareas (Lectura de tareas)

**Request:**
```javascript
POST https://script.google.com/.../exec
Content-Type: text/plain

{
  "action": "getTareas",
  "responsable": "Nicole",
  "secret": "arborea2025secure"
}
```

**Response esperada:**
```javascript
{
  "ok": true,
  "tareas": [
    {
      "taskId": "tarea-001",
      "responsable": "Nicole",
      "casa": "Ceiba",
      "titulo": "Revisar sistema de agua caliente",
      "descripcion": "El huésped reportó que el agua caliente tarda mucho...",
      "prioridad": "urgente",  // 'urgente' | 'normal'
      "semana": "2026-W28",
      "estado": "pendiente"
    }
  ]
}
```

### 2. tarea_completada (Cierre de tarea)

**Request:**
```javascript
{
  "tipo": "tarea_completada",
  "submissionId": "uuid-v4",
  "taskId": "tarea-001",
  "responsable": "Nicole",
  "observaciones": "Resuelto correctamente",
  "photos": [ /* array de fotos */ ],
  "deviceTimestamp": "2026-07-08T18:30:00.000Z",
  "secret": "arborea2025secure"
}
```

## Testing Local - Opción Rápida

### Desde la Consola del Navegador

1. Abre http://localhost:3000
2. Abre DevTools (F12) → Console
3. Pega y ejecuta:

```javascript
// Función helper para seedear tareas
async function seedTareas(responsable) {
  const tareas = [
    {
      taskId: 'tarea-001',
      responsable,
      casa: 'Ceiba',
      titulo: 'Revisar agua caliente',
      descripcion: 'El agua tarda en calentarse',
      prioridad: 'urgente',
      semana: '2026-W28',
      estado: 'pendiente'
    },
    {
      taskId: 'tarea-002',
      responsable,
      casa: 'Mango',
      titulo: 'Cambiar filtro piscina',
      descripcion: 'Mantenimiento preventivo',
      prioridad: 'normal',
      semana: '2026-W28',
      estado: 'pendiente'
    }
  ];
  
  // Guardar en IndexedDB
  const db = await indexedDB.databases().then(() => 
    indexedDB.open('arborea-ops')
  );
  
  return new Promise((resolve) => {
    db.onsuccess = (e) => {
      const database = e.target.result;
      const tx = database.transaction(['tareasCache'], 'readwrite');
      const store = tx.objectStore('tareasCache');
      store.put({
        responsable,
        tareas,
        timestamp: new Date().toISOString()
      });
      tx.oncomplete = () => {
        console.log('✅ Tareas insertadas para', responsable);
        resolve();
      };
    };
  });
}

// Ejecutar para Nicole
await seedTareas('Nicole');

// Luego refresca la página
location.reload();
```

## Logs de Debug

El módulo muestra logs detallados en consola:

```
[fetchTareas] Enviando request: { action: 'getTareas', responsable: 'Nicole' }
[fetchTareas] Backend error: Missing required fields
[fetchTareas] No hay caché disponible, devolviendo array vacío
```

El error "Missing required fields" es **esperado** hasta que el backend implemente `getTareas`.

## Flujo de Verificación

1. **Insertar datos de prueba** (ver arriba)
2. **Home** → Seleccionar persona → Ver "Mis pendientes (2)"
3. **Lista** → Ver tareas ordenadas (urgentes primero)
4. **Detalle** → Marcar como completada
5. **IndexedDB** → Verificar objeto en store 'submissions'

## Próximos Pasos Backend

Implementar en Code.gs:

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  
  // Handle getTareas
  if (data.action === 'getTareas') {
    if (!data.responsable || !data.secret) {
      return respond({ ok: false, error: 'Missing required fields' });
    }
    
    // TODO: Leer tareas de Sheet/Drive para el responsable
    const tareas = getTareasFromSheet(data.responsable);
    return respond({ ok: true, tareas });
  }
  
  // Handle tarea_completada
  if (data.tipo === 'tarea_completada') {
    // TODO: Guardar en Sheet, actualizar estado
    saveTareaCompletada(data);
    return respond({ ok: true, submissionId: data.submissionId });
  }
  
  // ... resto del código existente
}
```
