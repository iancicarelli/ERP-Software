import { FilterMap } from '../common';

/**
 * ============================================================================
 * Filtros de `/api/clientes/` — Fase 5
 * ----------------------------------------------------------------------------
 * FUENTE: `Nexo-frontend/Nexo/config/client_filter_config.py`. Cada clave de
 * este mapa es un query param que el frontend puede mandar; los tres tipos de
 * rango (`daterange`, `numrange`, `countrange`) derivan los suyos de un prefijo
 * — `monto_total` genera `monto_total`, `monto_total_min` y `monto_total_max`.
 * Ver `common/filters/filter-map.types.ts`.
 *
 * Este mapa vivía como fixture dentro de `filter-engine.spec.ts` desde la Fase
 * 2, justamente para poder mudarlo acá sin reescribirlo. Los tests que lo usan
 * allá se quedan: prueban el motor, no el módulo de clientes.
 *
 * El mismo mapa lo usan el listado, `all-ids` y (en la Fase 9) `bulk-action`.
 * Es un requisito del contrato, no una comodidad: "seleccionar todo" tiene que
 * devolver exactamente los ids que el listado está mostrando (§3.8).
 * ============================================================================
 */
export const CLIENTE_FILTERS: FilterMap = {
  search: {
    type: 'search',
    fields: ['nombre1', 'apellido1', 'apellido2', 'rut'],
  },
  rut: { type: 'icontains', field: 'rut' },
  id: { type: 'exact', field: 'id', cast: 'int' },

  fecha_creacion: { type: 'daterange', field: 'fecha_creacion' },
  moroso_desde: { type: 'daterange', field: 'moroso_desde' },
  fecha_de_baja: { type: 'daterange', field: 'fecha_de_baja' },

  // D4 — el cliente NO tiene `sector_id`: su sector y su zona son los de su
  // dirección principal. El `scope` es lo que acota el `some` a esa dirección;
  // sin él, un cliente matchearía por cualquiera de sus direcciones.
  sector: {
    type: 'relation',
    path: 'direcciones[].sector.sector',
    scope: { direcciones: { principal: true } },
  },
  zona: {
    type: 'relation',
    path: 'direcciones[].sector.zona.zona',
    scope: { direcciones: { principal: true } },
  },
  zona_exclude: {
    type: 'exclude',
    path: 'direcciones[].sector.zona.zona',
    scope: { direcciones: { principal: true } },
  },

  activo: { type: 'boolean', field: 'activo' },
  por_instalar: { type: 'boolean', field: 'por_instalar' },
  moroso: { type: 'boolean', field: 'moroso' },
  analogo: { type: 'boolean', field: 'analogo' },
  corte_poste: { type: 'boolean', field: 'corte_poste' },
  baja_por_renuncia: { type: 'boolean', field: 'baja_por_renuncia' },
  baja_por_morosidad: { type: 'boolean', field: 'baja_por_morosidad' },
  donacion: { type: 'boolean', field: 'donacion' },
  krill: { type: 'boolean', field: 'krill' },

  // Llegan como NOMBRE, no como id: el filtro del frontend es un `rx.select`
  // poblado con las etiquetas del catálogo (`CAUSAS_BAJA`, `ELEMENTOS`).
  causa_de_baja: { type: 'relation', path: 'causa_de_baja.causa' },
  servicio_elemento: { type: 'relation', path: 'servicios[].elemento.elemento' },

  cpes_todos: { type: 'numrange', field: 'cpes_todos' },
  cpes_inactivos: { type: 'numrange', field: 'cpes_inactivos' },
  monto_total: { type: 'numrange', field: 'monto_total' },

  // El único que Prisma no puede expresar en un `where`: se resuelve aparte
  // con `GROUP BY … HAVING COUNT(*)` (ver `common/filters/count-filters.ts`).
  cantidad_direcciones: {
    type: 'countrange',
    relation: { table: 'direcciones', groupBy: 'cliente_id' },
  },
};
