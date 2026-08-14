import { FilterMap } from '../common';

/**
 * ============================================================================
 * Filtros de `/api/servicios/` — Fase 6
 * ----------------------------------------------------------------------------
 * FUENTE: `Nexo-frontend/Nexo/config/service/service_filter_config.py`.
 *
 * Es el mapa más chico de los cinco: seis filtros contra los ~30 de clientes.
 * Cuatro de ellos son búsquedas sobre el CLIENTE del servicio, no sobre el
 * servicio en sí — la tabla de servicios es, en la práctica, una vista de
 * "quién tiene qué contratado".
 *
 * Sobre `icontains` con ruta con puntos: el tipo lo documenta como "solo para
 * columnas de texto", pero el `nest()` del engine resuelve rutas anidadas
 * igual que en `relation` (`nest('cliente.rut', …)` → `{cliente:{rut:…}}`). Se
 * usa `icontains` y no `relation` porque el filtro del frontend es de tipo
 * "search" —el usuario escribe un RUT parcial— y `relation` compara por
 * igualdad exacta.
 * ============================================================================
 */
export const SERVICIO_FILTERS: FilterMap = {
  activo: { type: 'boolean', field: 'activo' },

  // Llega como NOMBRE del elemento, no como id: el filtro es un `rx.select`
  // poblado con las etiquetas de `ELEMENTOS` (`config/utils/`). Igual que
  // `servicio_elemento` en el mapa de clientes.
  elemento_elemento: { type: 'relation', path: 'elemento.elemento' },

  cliente_rut: { type: 'icontains', field: 'cliente.rut' },
  cliente_nombre1: { type: 'icontains', field: 'cliente.nombre1' },
  cliente_apellido1: { type: 'icontains', field: 'cliente.apellido1' },
  cliente_apellido2: { type: 'icontains', field: 'cliente.apellido2' },

  /**
   * No está en `service_filter_config.py` y aun así es obligatorio: la tabla de
   * servicios del DETALLE DE CLIENTE pide `?cliente_id=`
   * (`ClientTableServiceState.get_filters()`), igual que hace la de direcciones.
   * Sin esto, esa tabla mostraría los servicios de todos los clientes.
   */
  cliente_id: { type: 'exact', field: 'cliente_id', cast: 'int' },
};
