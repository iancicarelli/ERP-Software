import { FilterMap } from '../common';

/**
 * ============================================================================
 * Filtros de `/api/transferencias/` — Fase 8
 * ----------------------------------------------------------------------------
 * FUENTE: `Nexo-frontend/Nexo/config/transfer/transfer_filter_config.py`, más
 * `IndexTransferState.get_stats()` (dashboard) y
 * `TransferTableState.trigger_select_all()` (`all-ids`).
 *
 * A diferencia del mapa de pagos, acá **todas las claves van en snake_case**:
 * el config de transferencias no arrastra el camelCase del sistema viejo.
 * ============================================================================
 */
export const TRANSFERENCIA_FILTERS: FilterMap = {
  /**
   * "Buscar por Nombre". A diferencia de pagos, la transferencia SÍ tiene un
   * nombre propio (`nombre` = el titular que aparece en la cartola del banco),
   * y es el más útil: sobre una transferencia sin conciliar es lo único que hay
   * para buscar. Se incluye igual el nombre del cliente para que buscar a
   * alguien ya conciliado encuentre sus transferencias aunque el banco haya
   * escrito el titular distinto.
   */
  search: {
    type: 'search',
    fields: [
      'nombre',
      'cliente.nombre1',
      'cliente.apellido1',
      'cliente.apellido2',
    ],
  },

  // Genera `fecha_after` (>=) y `fecha_before` (<). Igual que en pagos, el
  // dashboard cuenta "hoy" mandando mañana como `_before`.
  fecha: { type: 'daterange', field: 'fecha' },

  /**
   * `estado` y `estado__not` filtran la MISMA columna, y por eso `estado__not`
   * se declara con la clave literal: derivar el sufijo daría `estado__not__not`
   * (ver la regla de nombres en `filter-map.types.ts`).
   *
   * El config los declara como `type: "boolean"` con `options: ["Ok"]`, pero lo
   * que viaja por el cable NO es un booleano: `TransferTableState.get_filters()`
   * los intercepta y manda el string `"Ok"`. Por eso acá son `exact`/`not` sobre
   * texto — un `type: 'boolean'` castearía `"Ok"` a `undefined` y el filtro
   * quedaría mudo.
   */
  estado: { type: 'exact', field: 'estado' },
  estado__not: { type: 'not', field: 'estado' },

  /** Mismo predicado calculado que en pagos: `cliente_id IS NOT NULL`. */
  cliente_existe: {
    type: 'computed',
    cast: 'boolean',
    apply: (value) =>
      value === true ? { cliente_id: { not: null } } : { cliente_id: null },
  },

  documento_pagado: { type: 'boolean', field: 'documento_pagado' },
  banco_origen: { type: 'exact', field: 'banco_origen' },

  // D4 — sector y zona salen de la dirección principal del cliente.
  cliente_sector: {
    type: 'relation',
    path: 'cliente.direcciones[].sector.sector',
    scope: { direcciones: { principal: true } },
  },
  cliente_zona: {
    type: 'relation',
    path: 'cliente.direcciones[].sector.zona.zona',
    scope: { direcciones: { principal: true } },
  },

  /**
   * ⚠️ La transferencia **no tiene columna `cliente_rut`**: el RUT que trae es
   * `rut_transferencia`, el de quien hizo la transferencia. El propio DTO del
   * frontend lo dice —`#cliente_rut: str mismo que rut_transferencia`
   * (`dtos/transfers/transfers_table_dto.py:7`)— y por eso el filtro rotulado
   * "Buscar por RUT Cliente" apunta acá.
   *
   * Es el comportamiento correcto además del único posible: filtrar por
   * `cliente.rut` dejaría fuera justo las transferencias sin conciliar, que son
   * las que el usuario está buscando cuando escribe un RUT en esa pantalla.
   */
  cliente_rut: { type: 'icontains', field: 'rut_transferencia' },

  id: { type: 'exact', field: 'id', cast: 'int' },
};
