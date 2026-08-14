import { FilterMap } from '../common';

/**
 * ============================================================================
 * Filtros de `/api/ordenes/` — Fase 7
 * ----------------------------------------------------------------------------
 * FUENTE: `Nexo-frontend/Nexo/config/order/order_filter_config.py`, que declara
 * **52 query params**. Es el config más grande de los cinco.
 *
 * Recordatorio de la regla de nombres (`common/filters/filter-map.types.ts`):
 * la clave ES el param, salvo en `daterange` (genera `_after`/`_before`) y
 * `numrange` (genera la clave pelada, `_min` y `_max`).
 *
 * El mismo mapa lo usan el listado y `all-ids`, que por contrato tienen que
 * aplicar exactamente los mismos filtros (§3.8).
 * ============================================================================
 */
export const ORDEN_FILTERS: FilterMap = {
  // ── Texto libre ───────────────────────────────────────────────────────────
  // Busca sobre el SNAPSHOT de la orden, no sobre el cliente relacionado (D9):
  // una orden con `cliente_id` en null igual tiene que aparecer.
  search: { type: 'search', fields: ['nombre1', 'apellido1', 'apellido2', 'rut'] },
  rut: { type: 'icontains', field: 'rut' },
  id: { type: 'exact', field: 'id', cast: 'int' },

  // ── Fechas ────────────────────────────────────────────────────────────────
  // Las cinco son `daterange`: cada una consume `<key>_after` y `<key>_before`,
  // con el límite superior EXCLUSIVO (ver `DateRangeFilterDef`).
  fecha_ingreso: { type: 'daterange', field: 'fecha_ingreso' },
  fecha_contrato: { type: 'daterange', field: 'fecha_contrato' },
  fecha_pago: { type: 'daterange', field: 'fecha_pago' },
  fecha_programado: { type: 'daterange', field: 'fecha_programado' },
  fecha_instalado: { type: 'daterange', field: 'fecha_instalado' },

  // ── Catálogos relacionados ────────────────────────────────────────────────
  // Llegan como NOMBRE, no como id: los tres son `rx.select` poblados con
  // etiquetas.
  //
  // `estado_estado` va como `relation` (igualdad exacta) porque la lista del
  // frontend (`config/utils/estado_config.py`) coincide **carácter por
  // carácter** con las 8 filas de `estados_orden`. Verificado contra la base.
  estado_estado: { type: 'relation', path: 'estado.estado' },

  // `servicio_servicio` y `causa_causa` NO coinciden, y por eso van como
  // `icontains` en vez de `relation`:
  //
  //   · el select de servicio se llena con `ELEMENTOS` —"PLAN DUO CLASICO", en
  //     mayúsculas— mientras que la tabla contra la que se filtra es
  //     `servicios_orden` —"Plan Duo Clasico"—. Con igualdad exacta, TODA
  //     selección devolvería 0 filas. `icontains` es insensible a mayúsculas y
  //     además tolera que el nombre del catálogo sea un prefijo del real
  //     ("TV FIBRA OPTICA" ⊂ "Servicio TV Fibra Optica").
  //
  //   · el select de causa se llena con `CAUSAS_BAJA`, que son las causas de
  //     baja de un CLIENTE ("Por morosidad", "Cambio de empresa"…), no las de
  //     una orden ("Falta de poste", "NAP saturado"…). Ahí no hay
  //     insensibilidad que valga: son dos catálogos distintos y el solapamiento
  //     es cero. **El filtro está bien acá y mal en el frontend** — ver la nota
  //     al pie. `icontains` al menos hace que "Falta de postes" encuentre
  //     "Falta de poste".
  servicio_servicio: { type: 'icontains', field: 'servicio.servicio' },
  causa_causa: { type: 'icontains', field: 'causa.causa' },

  // ── Ubicación ─────────────────────────────────────────────────────────────
  // A diferencia de clientes (D4), la orden SÍ tiene `zona_id` y `sector_id`
  // propios: no hay que resolverlos por la dirección, y por eso no hace falta
  // `scope`.
  sector_sector: { type: 'relation', path: 'sector.sector' },
  zona_zona: { type: 'relation', path: 'zona.zona' },
  zona_exclude: { type: 'exclude', path: 'zona.zona' },

  // ── Flags (15) ────────────────────────────────────────────────────────────
  contrato_nuevo: { type: 'boolean', field: 'contrato_nuevo' },
  modificacion_plan: { type: 'boolean', field: 'modificacion_plan' },
  migracion: { type: 'boolean', field: 'migracion' },
  traslado: { type: 'boolean', field: 'traslado' },
  pago_instalacion: { type: 'boolean', field: 'pago_instalacion' },
  medidor_luz: { type: 'boolean', field: 'medidor_luz' },
  ducto: { type: 'boolean', field: 'ducto' },
  poda: { type: 'boolean', field: 'poda' },
  vecino: { type: 'boolean', field: 'vecino' },
  postacion: { type: 'boolean', field: 'postacion' },
  abierto: { type: 'boolean', field: 'abierto' },
  evaluacion: { type: 'boolean', field: 'evaluacion' },
  bienvenida: { type: 'boolean', field: 'bienvenida' },
  comision: { type: 'boolean', field: 'comision' },
  comision_pagada: { type: 'boolean', field: 'comision_pagada' },

  // ── Cantidades ────────────────────────────────────────────────────────────
  // Cada una consume tres params: exacto, `_min` y `_max`. Ojo con el par
  // `anexos_extras` / `anexos_extras_exterior`: son claves distintas y el motor
  // hace lookup exacto, así que `anexos_extras_exterior_min` no lo captura el
  // rango de `anexos_extras`.
  anexos_extras: { type: 'numrange', field: 'anexos_extras' },
  anexos_extras_exterior: { type: 'numrange', field: 'anexos_extras_exterior' },
  sintonizadores: { type: 'numrange', field: 'sintonizadores' },
  extensores_wifi: { type: 'numrange', field: 'extensores_wifi' },

  // ── Personas (D8) ─────────────────────────────────────────────────────────
  // `icontains`, no `exact`: es lo que hace que el corte de los nombres
  // compuestos deje de importar. Buscar "Juan" en `tecnico_nombre1` encuentra a
  // "Juan Carlos" igual, así que un corte discutible no le cambia el resultado
  // al usuario. Sin esto, D8 habría quedado bloqueada esperando a negocio.
  vendedor_nombre1: { type: 'icontains', field: 'vendedor.nombre1' },
  vendedor_apellido1: { type: 'icontains', field: 'vendedor.apellido1' },
  vendedor_apellido2: { type: 'icontains', field: 'vendedor.apellido2' },
  tecnico_nombre1: { type: 'icontains', field: 'tecnico.nombre1' },
  tecnico_apellido1: { type: 'icontains', field: 'tecnico.apellido1' },
  tecnico_apellido2: { type: 'icontains', field: 'tecnico.apellido2' },
};

/**
 * ⚠️ **Deuda del frontend, no de acá.** `causa_causa` y `servicio_servicio`
 * ofrecen opciones que no salen de la tabla contra la que filtran:
 *
 * | Filtro | Opciones que muestra | Tabla real | Solapamiento |
 * |--------|----------------------|------------|--------------|
 * | `causa_causa` | `CAUSAS_BAJA` (6 causas de baja de cliente) | `causas_orden` (9) | **ninguno** |
 * | `servicio_servicio` | `ELEMENTOS` (24, MAYÚSCULAS) | `servicios_orden` (17, Capitalizado) | parcial |
 *
 * El backend filtra bien; lo que está mal es de dónde saca las etiquetas el
 * `rx.select`. La corrección es del lado del frontend —apuntar esos dos
 * `options` a `/causas-ordenes/` y `/servicios-ordenes/`, que ya existen desde
 * la Fase 4a y ya se cargan en `OrderDropdownState`— y **no se hizo en esta
 * fase**: cuál es la lista correcta de causas es una pregunta de negocio, no
 * una de código. Anotado en el ROADMAP §7 (R9).
 */
