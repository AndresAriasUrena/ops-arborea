// src/checklists/checklists.ts
// 17 checklists de Arbórea Ops (16 del doc + "Reporte de incidencia" on-demand).
// Fuente: doc "Checklist de Control" (tabs Limpieza y Mantenimiento).
//
// Interfaces (extendidas con `icon`, `required`):
// interface ChecklistItem {
//   id: string; label: string;
//   type: 'check' | 'number' | 'choice' | 'text';
//   options?: string[]; required?: boolean;
// }
// interface ChecklistSchema {
//   id: string; role: 'limpieza' | 'mant'; label: string; icon: string;
//   sections: { title: string; items: ChecklistItem[] }[];
//   notes?: boolean; photos?: { max: number; required?: boolean };
// }
// El launcher (persona→casa→checklist) puede derivar su lista filtrando CHECKLISTS por role,
// así esta es la única fuente. Asegurate de que cada `icon` tenga su SVG en el set de íconos.

import type { ChecklistSchema } from "@/config";

export const CHECKLISTS: ChecklistSchema[] = [
  /* ====================================================== LIMPIEZA (7) ===== */

  { id: "checkin", role: "limpieza", label: "Check-in · Preparación", icon: "bed",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Entrada y áreas comunes", items: [
        { id: "ent_pisos", label: "Barrer y trapear pisos", type: "check" },
        { id: "ent_muebles", label: "Limpiar muebles y superficies", type: "check" },
        { id: "ent_deco", label: "Sacudir decoración y cuadros", type: "check" },
        { id: "ent_espejos", label: "Limpiar espejos", type: "check" },
        { id: "ent_telaranas", label: "Eliminar telarañas", type: "check" },
        { id: "ent_alfombras", label: "Aspirar alfombras", type: "check" },
        { id: "ent_aroma", label: "Aromatizar espacios", type: "check" },
        { id: "ent_ac", label: "Verificar temperatura / A/C a temperatura de bienvenida", type: "check" },
        { id: "ent_luces", label: "Encender luces de ambiente / lámparas decorativas", type: "check" },
      ]},
      { title: "Habitaciones", items: [
        { id: "hab_ropa", label: "Cambiar ropa de cama (limpia, planchada)", type: "check" },
        { id: "hab_cama", label: "Tender cama estilo hotel", type: "check" },
        { id: "hab_mesas", label: "Limpiar mesas de noche y lámparas", type: "check" },
        { id: "hab_closets", label: "Revisar closets (perchas, caja fuerte vacía y abierta)", type: "check" },
      ]},
      { title: "Baños", items: [
        { id: "ban_desinfectar", label: "Desinfectar inodoro, ducha, lavamanos", type: "check" },
        { id: "ban_griferia", label: "Pulir grifería y espejos", type: "check" },
        { id: "ban_toallas", label: "Doblar toallas estilo hotel + toalla de piscina extra", type: "check" },
        { id: "ban_papel", label: "Papel higiénico con doblez en punta", type: "check" },
      ]},
      { title: "Amenities (reponer completos)", items: [
        { id: "ame_basicos", label: "Shampoo / acondicionador / crema / jabón cuerpo", type: "check" },
        { id: "ame_scrub", label: "Scrub en tabla de madera / jabón tallow", type: "check" },
      ]},
      { title: "Cocina", items: [
        { id: "coc_refri", label: "Refrigerador limpio y frío", type: "check" },
        { id: "coc_reponer", label: "Reponer: frutas, aceite, sal, pimienta, miel", type: "check" },
        { id: "coc_welcome", label: "Welcome básico (agua, café, té) según paquete reservado", type: "check" },
        { id: "coc_electro", label: "Limpiar electrodomésticos", type: "check" },
      ]},
      { title: "Mesa de centro", items: [
        { id: "mes_detalle", label: "Repelente / hierbas / chocolate", type: "check" },
      ]},
      { title: "Exteriores", items: [
        { id: "ext_mobiliario", label: "Retirar hojas, limpiar mobiliario, mesas, sillas, barandas", type: "check" },
      ]},
      { title: "Control de calidad final", items: [
        { id: "qc_limpio", label: "No hay cabellos visibles / olores / polvo", type: "check", required: true },
        { id: "qc_focos", label: "Todos los focos funcionan", type: "check", required: true },
        { id: "qc_sistemas", label: "A/C, puertas y WiFi funcionando", type: "check", required: true },
        { id: "qc_inventario", label: "Inventario completo", type: "check", required: true },
        { id: "qc_fotos", label: "Fotografías de entrega tomadas", type: "check", required: true },
      ]},
    ],
  },

  { id: "checkout", role: "limpieza", label: "Check-out · Salida", icon: "logout",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Inspección y salida", items: [
        { id: "co_danos", label: "Inspección de daños/faltantes ANTES de tocar nada (con fotos)", type: "check", required: true },
        { id: "co_minibar", label: "Retirar y registrar consumo de minibar (→ checklist Minibar)", type: "check" },
        { id: "co_olvidados", label: "Revisar objetos olvidados del huésped (lost & found)", type: "check" },
        { id: "co_ropa", label: "Retirar toda la ropa de cama y toallas usadas", type: "check" },
        { id: "co_refri", label: "Limpiar refrigerador (retirar comida dejada)", type: "check" },
        { id: "co_pisos", label: "Barrer / trapear / aspirar todas las áreas", type: "check" },
        { id: "co_banos", label: "Desinfectar todos los baños", type: "check" },
        { id: "co_basura", label: "Vaciar toda la basura", type: "check" },
        { id: "co_piscina", label: "Revisar y limpiar piscina/jacuzzi tras uso", type: "check" },
        { id: "co_fotos", label: "Fotografías de estado de salida", type: "check", required: true },
      ]},
      { title: "Reportes", items: [
        { id: "co_reporte", label: "Reporte de daños / mantenimiento (si se detecta algo)", type: "text" },
      ]},
    ],
  },

  { id: "minibar", role: "limpieza", label: "Check-out · Minibar", icon: "cup",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Minibar — cantidad consumida", items: [
        { id: "mb_agua_mineral", label: "Agua mineral (botella)", type: "number" },
        { id: "mb_agua_gas", label: "Agua con gas", type: "number" },
        { id: "mb_cerveza", label: "Cerveza artesanal local", type: "number" },
        { id: "mb_vino_tinto", label: "Vino tinto (mini)", type: "number" },
        { id: "mb_vino_blanco", label: "Vino blanco (mini)", type: "number" },
        { id: "mb_refresco", label: "Refresco / soda", type: "number" },
        { id: "mb_jugo", label: "Jugo natural", type: "number" },
        { id: "mb_snack", label: "Snack salado (nueces/chips)", type: "number" },
        { id: "mb_chocolate", label: "Chocolate artesanal", type: "number" },
        { id: "mb_cafe", label: "Café especial / cápsulas", type: "number" },
        { id: "mb_te", label: "Té selección", type: "number" },
        { id: "mb_kombucha", label: "Kombucha / bebida wellness", type: "number" },
      ]},
    ],
  },

  { id: "repaso", role: "limpieza", label: "Repaso diario", icon: "leaf",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Repaso (huésped en casa — discreto)", items: [
        { id: "rep_camas", label: "Tender camas / acomodar habitación", type: "check" },
        { id: "rep_toallas", label: "Cambiar toallas usadas", type: "check" },
        { id: "rep_amenities", label: "Reponer amenities consumidos", type: "check" },
        { id: "rep_basura", label: "Vaciar basureros", type: "check" },
        { id: "rep_banos", label: "Repaso de baños (inodoro, lavamanos, espejo)", type: "check" },
        { id: "rep_pisos", label: "Barrer/trapear áreas de alto tránsito", type: "check" },
        { id: "rep_cocina", label: "Limpiar cocina si fue usada", type: "check" },
        { id: "rep_agua", label: "Reponer agua/hielo", type: "check" },
        { id: "rep_aroma", label: "Aromatizar discretamente", type: "check" },
        { id: "rep_turndown", label: "Turn-down nocturno (cama, luz tenue, agua en mesa de noche)", type: "check" },
      ]},
    ],
  },

  { id: "profunda", role: "limpieza", label: "Limpieza profunda (mensual)", icon: "drop",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Limpieza profunda", items: [
        { id: "pr_ventanas", label: "Limpiar ventanas y rieles a fondo", type: "check" },
        { id: "pr_interruptores", label: "Limpiar interruptores y tomacorrientes", type: "check" },
        { id: "pr_puertas", label: "Limpiar puertas y marcos", type: "check" },
        { id: "pr_alfombras", label: "Aspirar/lavar alfombras a fondo", type: "check" },
        { id: "pr_ac", label: "Limpiar aire acondicionado (filtros)", type: "check" },
        { id: "pr_drenajes", label: "Revisar drenajes de baños", type: "check" },
        { id: "pr_cortinas", label: "Lavar cortinas / textiles", type: "check" },
        { id: "pr_electro", label: "Limpieza profunda de electrodomésticos (horno, refri por dentro)", type: "check" },
        { id: "pr_muebles", label: "Limpiar detrás/debajo de muebles pesados", type: "check" },
        { id: "pr_madera", label: "Pulir madera / tratar superficies (humedad de selva)", type: "check" },
        { id: "pr_cojines", label: "Lavar fundas de cojines exteriores", type: "check" },
      ]},
      { title: "Reportes", items: [
        { id: "pr_rep_danos", label: "Reporte de daños o mantenimiento", type: "text" },
        { id: "pr_rep_restock", label: "Reporte de restock", type: "text" },
      ]},
    ],
  },

  { id: "anual_limpieza", role: "limpieza", label: "Limpieza mayor (anual)", icon: "sparkle",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Limpieza mayor", items: [
        { id: "anl_colchones", label: "Lavado profundo de colchones y rotación", type: "check" },
        { id: "anl_almohadas", label: "Lavado de almohadas y edredones", type: "check" },
        { id: "anl_tapiceria", label: "Limpieza profunda de tapicería y sofás", type: "check" },
        { id: "anl_alfombras", label: "Lavado de alfombras profesional", type: "check" },
        { id: "anl_antihongos", label: "Tratamiento antihongos en áreas húmedas", type: "check" },
        { id: "anl_ductos", label: "Revisión y limpieza profunda de ductos de A/C", type: "check" },
        { id: "anl_textiles", label: "Reemplazo de textiles desgastados (toallas, sábanas)", type: "check" },
      ]},
      { title: "Reportes y proyectos", items: [
        { id: "anl_rep_danos", label: "Reporte de daños o mantenimiento", type: "text" },
        { id: "anl_proy_corto", label: "Proyectos a corto plazo", type: "text" },
        { id: "anl_proy_medio", label: "Proyectos a mediano plazo", type: "text" },
        { id: "anl_proy_largo", label: "Proyectos a largo plazo", type: "text" },
      ]},
    ],
  },

  { id: "inventario_limpieza", role: "limpieza", label: "Inventario · Limpieza", icon: "box",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Lencería, amenities y suministros", items: [
        { id: "invl_sabanas", label: "Revisar sábanas (cantidad, estado)", type: "check" },
        { id: "invl_toallas", label: "Revisar toallas (cantidad, estado)", type: "check" },
        { id: "invl_organizar", label: "Doblar y organizar ropa de cama", type: "check" },
        { id: "invl_danos", label: "Registrar daños", type: "check" },
        { id: "invl_amenities", label: "Conteo de amenities (shampoo, jabones, etc.)", type: "check" },
        { id: "invl_productos", label: "Conteo de productos de limpieza / stock", type: "check" },
        { id: "invl_vajilla", label: "Conteo de vajilla, cristalería, cubertería", type: "check" },
        { id: "invl_faltantes", label: "Registro de faltantes/roturas y solicitud de reposición", type: "check" },
      ]},
      { title: "Reposición", items: [
        { id: "invl_restock", label: "Solicitud de restock", type: "text" },
      ]},
    ],
  },

  /* ================================================= MANTENIMIENTO (9) ===== */

  { id: "mant_checkin", role: "mant", label: "Check-in · Verificación técnica", icon: "plug",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Verificación pre-llegada", items: [
        { id: "mci_ac", label: "A/C funcionando en todas las habitaciones", type: "check" },
        { id: "mci_wifi", label: "WiFi funcionando", type: "check" },
        { id: "mci_focos", label: "Todos los focos / luces funcionando", type: "check" },
        { id: "mci_agua_caliente", label: "Agua caliente funcionando", type: "check" },
        { id: "mci_piscina", label: "Piscina/jacuzzi en condiciones (química OK, agua cristalina)", type: "check" },
        { id: "mci_presion", label: "Presión de agua adecuada", type: "check" },
        { id: "mci_porton", label: "Portón y cerraduras funcionando", type: "check" },
        { id: "mci_electro", label: "Electrodomésticos de cocina operativos", type: "check" },
      ]},
    ],
  },

  { id: "mant_checkout", role: "mant", label: "Check-out · Revisión técnica", icon: "logout",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Revisión post-salida", items: [
        { id: "mco_danos", label: "Inspección de daños en equipos/instalaciones", type: "check" },
        { id: "mco_fugas", label: "Revisar fugas tras uso intensivo", type: "check" },
        { id: "mco_piscina", label: "Revisar estado de piscina/jacuzzi", type: "check" },
        { id: "mco_electro", label: "Verificar electrodomésticos funcionando", type: "check" },
        { id: "mco_apagar", label: "Apagar/ajustar equipos no necesarios (ahorro energético)", type: "check" },
      ]},
      { title: "Reportes", items: [
        { id: "mco_reparaciones", label: "Reparaciones necesarias antes del próximo huésped", type: "text" },
      ]},
    ],
  },

  { id: "diario", role: "mant", label: "Diario", icon: "tool",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Rutina diaria", items: [
        { id: "di_basura", label: "Recoger basura", type: "check", required: true },
        { id: "di_piscinas", label: "Limpiar piscinas", type: "check", required: true },
        { id: "di_quimica", label: "Revisar nivel y química de piscina", type: "check" },
        { id: "di_skimmer", label: "Retirar hojas de piscina y skimmer", type: "check" },
        { id: "di_luces", label: "Inspección visual de luces exteriores", type: "check" },
        { id: "di_solar", label: "Verificar producción solar normal", type: "check" },
        { id: "di_bombas", label: "Revisar bombas de agua funcionando", type: "check" },
      ]},
    ],
  },

  { id: "semanal", role: "mant", label: "Semanal", icon: "tree",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Rutina semanal", items: [
        { id: "se_jardines", label: "Jardines limpios / retirar hojas", type: "check" },
        { id: "se_riego", label: "Sistema de riego funcionando", type: "check" },
        { id: "se_senderos", label: "Senderos en buen estado", type: "check" },
        { id: "se_solar", label: "Limpiar paneles solares (polvo/hojas)", type: "check" },
        { id: "se_decks", label: "Lavado a presión de decks/terrazas si requiere", type: "check" },
        { id: "se_mosquiteros", label: "Revisar mosquiteros", type: "check" },
        { id: "se_backwash", label: "Backwash de filtro de piscina", type: "check" },
        { id: "se_camaras", label: "Prueba rápida de cámaras y WiFi", type: "check" },
      ]},
    ],
  },

  { id: "mensual", role: "mant", label: "Mensual", icon: "gauge",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Rutina mensual", items: [
        { id: "me_piscina", label: "Bomba y filtro de piscina funcionando", type: "check" },
        { id: "me_agua", label: "Sistema de agua: presión, tanques, fugas, filtros, drenajes", type: "check" },
        { id: "me_solar", label: "Sistema solar: paneles, inversor, producción, cableado, baterías", type: "check" },
        { id: "me_generador", label: "Generador: arranque, combustible, aceite, batería, fugas", type: "check" },
        { id: "me_ac", label: "A/C: revisar y limpiar filtros", type: "check" },
        { id: "me_cerraduras", label: "Lubricar cerraduras, rieles de puertas corredizas", type: "check" },
        { id: "me_sellos", label: "Revisar sellos de puertas/ventanas", type: "check" },
        { id: "me_humo", label: "Detectores de humo (prueba)", type: "check" },
        { id: "me_extintores", label: "Revisar extintores vigentes", type: "check" },
      ]},
    ],
  },

  { id: "trimestral", role: "mant", label: "Trimestral", icon: "paint",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Rutina trimestral", items: [
        { id: "tr_poda", label: "Poda de árboles y control de crecimiento (selva crece rápido)", type: "check" },
        { id: "tr_ac", label: "Servicio profesional de A/C (gas, serpentines)", type: "check" },
        { id: "tr_baterias", label: "Revisión a fondo de baterías solares", type: "check" },
        { id: "tr_inspeccion", label: "Inspección de paredes/techos: humedad, grietas, manchas", type: "check" },
        { id: "tr_pintura", label: "Retoque de pintura / pintar manchas de las casas", type: "check" },
        { id: "tr_plagas", label: "Control de plagas / fumigación preventiva", type: "check" },
        { id: "tr_cerca", label: "Revisión de cerca perimetral completa", type: "check" },
      ]},
    ],
  },

  { id: "semestral", role: "mant", label: "Semestral", icon: "shield",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Rutina semestral", items: [
        { id: "sm_techo", label: "Mantenimiento de cobertura/impermeabilizante del techo", type: "check" },
        { id: "sm_madera", label: "Sellado de madera de decks y barandas (sol + humedad)", type: "check" },
        { id: "sm_generador", label: "Servicio mayor de generador", type: "check" },
        { id: "sm_tanques", label: "Limpieza profunda de tanques de agua", type: "check" },
        { id: "sm_electrico", label: "Revisión completa de sistema eléctrico", type: "check" },
        { id: "sm_estructura", label: "Inspección estructural de decks/treehouse (clave en Ceiba)", type: "check" },
        { id: "sm_extintores", label: "Recarga/revisión de extintores", type: "check" },
      ]},
    ],
  },

  { id: "anual_mant", role: "mant", label: "Anual", icon: "building",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Rutina anual", items: [
        { id: "anm_estructura", label: "Inspección estructural completa de la casa", type: "check" },
        { id: "anm_repintado", label: "Repintado de áreas exteriores expuestas", type: "check" },
        { id: "anm_solar", label: "Servicio profesional completo de sistema solar", type: "check" },
        { id: "anm_baterias", label: "Revisión/reemplazo de baterías solares según vida útil", type: "check" },
        { id: "anm_impermeabilizar", label: "Impermeabilización mayor de techos", type: "check" },
        { id: "anm_termitas", label: "Tratamiento antitermitas / madera estructural", type: "check" },
        { id: "anm_pozo", label: "Revisión de pozo/sistema séptico", type: "check" },
        { id: "anm_seguridad", label: "Auditoría de seguridad (cámaras, alarmas, cercas)", type: "check" },
      ]},
    ],
  },

  { id: "inventario_mant", role: "mant", label: "Inventario · Mantenimiento", icon: "box",
    notes: true, photos: { max: 10 },
    sections: [
      { title: "Herramientas, repuestos y equipos", items: [
        { id: "invm_herramientas", label: "Conteo de herramientas", type: "check" },
        { id: "invm_repuestos", label: "Stock de repuestos (filtros, focos, químicos de piscina)", type: "check" },
        { id: "invm_combustible", label: "Combustible de generador en stock", type: "check" },
        { id: "invm_equipos", label: "Estado de equipos mayores (bombas, inversor, generador)", type: "check" },
        { id: "invm_garantias", label: "Registro de garantías y fechas de servicio", type: "check" },
        { id: "invm_quimicos", label: "Productos químicos de piscina (nivel de stock)", type: "check" },
      ]},
      { title: "Reposición", items: [
        { id: "invm_restock", label: "Solicitud de reposición", type: "text" },
      ]},
    ],
  },

  /* ============================================ EXTRA · ON-DEMAND (1) ====== */

  { id: "incidencia", role: "mant", label: "Reporte de incidencia", icon: "alert",
    notes: true, photos: { max: 10, required: true },
    sections: [
      { title: "Detalle del problema", items: [
        { id: "in_area", label: "Área / ubicación", type: "choice", required: true,
          options: ["Cocina", "Baño", "Habitación", "Piscina", "Exterior/Jardín", "Eléctrico", "Plomería", "A/C", "Otro"] },
        { id: "in_desc", label: "Descripción del problema", type: "text", required: true },
        { id: "in_prioridad", label: "Prioridad", type: "choice", required: true,
          options: ["Crítica", "Alta", "Media", "Baja"] },
        { id: "in_huesped", label: "¿Hay huésped en la casa ahora?", type: "choice", options: ["Sí", "No"] },
      ]},
      { title: "Acción", items: [
        { id: "in_resuelto", label: "¿Se resolvió en el momento?", type: "choice", options: ["Sí", "No"] },
        { id: "in_repuesto", label: "Repuesto / insumo requerido de bodega", type: "text" },
      ]},
    ],
  },
];
