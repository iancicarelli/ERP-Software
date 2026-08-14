import { FilterMap } from '../common';

/**
 * ============================================================================
 * Filtros de `/api/pagos/` — Fase 8
 * ----------------------------------------------------------------------------
 * FUENTE: `Nexo-frontend/Nexo/config/payment/payment_filter_config.py` y los
 * dos consumidores que no salen de ahí: `IndexPaymentState.get_stats()`
 * (dashboard) y `PaymentTableState.trigger_select_all()` (`all-ids`).
 *
 * ⚠️ **El único mapa con claves en camelCase.** `entryDate_after`,
 * `fiscalYear`, `voucherType`, `documentType` y `entryUser` rompen D2
 * (snake_case en toda la API) porque el frontend los manda así y la clave del
 * mapa ES el nombre del query param. No es un descuido heredado: está anotado
 * como excepción explícita en `Nexo-frontend/CLAUDE.md` y en el ROADMAP §5.
 * Renombrarlos acá dejaría los cinco filtros mudos —el engine descarta en
 * silencio lo que no matchea— y nadie se enteraría hasta abrir `/payments`.
 *
 * Las claves que SÍ van en snake_case (`cliente_sector`, `cliente_zona`,
 * `cliente_existe`, `cliente_rut`, `id`, `search`) también salen del config
 * del frontend. La mezcla es fea y es la que hay.
 * ============================================================================
 */
export const PAGO_FILTERS: FilterMap = {
  /**
   * "Buscar por Nombre — Nombre o apellido...". El pago no tiene columnas de
   * nombre: el único nombre que existe es el del cliente asociado, así que la
   * búsqueda cruza la relación. Un pago sin cliente nunca matchea, que es lo
   * correcto — no hay nombre contra el cual comparar.
   */
  search: {
    type: 'search',
    fields: ['cliente.nombre1', 'cliente.apellido1', 'cliente.apellido2'],
  },

  /**
   * Genera `entryDate_after` (>=) y `entryDate_before` (<) sobre `entry_date`.
   *
   * El límite superior EXCLUSIVO no es un detalle: el dashboard cuenta "pagos
   * de hoy" mandando `entryDate_after=hoy&entryDate_before=mañana`
   * (`index_payment_state.py:27`). Con un `<=` el rango se comería el día
   * siguiente entero.
   */
  entryDate: { type: 'daterange', field: 'entry_date' },

  /**
   * D4 — el cliente no tiene sector propio: se resuelve por su dirección
   * principal. El `scope` acota el `some` a esa dirección; sin él, un pago
   * matchearía por cualquiera de las direcciones del cliente.
   */
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

  // El select del frontend ofrece los años como texto ("2024"); la columna es
  // `SmallInt`. Sin el cast, el engine compararía string contra int y Prisma
  // tiraría un error de tipo en vez de filtrar.
  fiscalYear: { type: 'exact', field: 'fiscal_year', cast: 'int' },

  voucherType: { type: 'exact', field: 'voucher_type' },
  documentType: { type: 'exact', field: 'document_type' },
  entryUser: { type: 'exact', field: 'entry_user' },

  /**
   * `cliente_existe` NO es una columna: es `cliente_id IS NOT NULL`. Así lo
   * documenta el modelo (`schema.prisma`, comentario sobre `cliente_rut`) y así
   * lo pide el dashboard, que cuenta pagos conciliados y sin conciliar.
   *
   * `apply` recibe el valor ya casteado a booleano, así que llega tanto el
   * `"true"`/`"false"` del dashboard como el `True`/`False` que produce
   * `_normalize_value()` a partir del "Si"/"No" del select.
   */
  cliente_existe: {
    type: 'computed',
    cast: 'boolean',
    apply: (value) =>
      value === true ? { cliente_id: { not: null } } : { cliente_id: null },
  },

  /**
   * Busca contra el SNAPSHOT (`pagos.cliente_rut`), no contra `cliente.rut`. Un
   * pago sin conciliar no tiene cliente y su RUT es justamente el único dato
   * que permite encontrarlo — filtrar por la relación lo dejaría invisible.
   */
  cliente_rut: { type: 'icontains', field: 'cliente_rut' },

  id: { type: 'exact', field: 'id', cast: 'int' },
};
