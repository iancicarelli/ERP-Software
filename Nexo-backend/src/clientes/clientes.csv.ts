import { ColumnaCsv } from '../common';
import { ClienteConRelaciones } from './clientes.serializer';

/**
 * ============================================================================
 * Columnas del CSV de clientes — Fase 9
 * ----------------------------------------------------------------------------
 * **El archivo replica la tabla de `/client`, no la entidad.** Es la decisión
 * de la fase: el usuario exporta lo que está mirando. Las columnas y su orden
 * salen de `MANUAL_COLUMNS` (`pages/management/clients/client.py`):
 *
 *   Nombre Completo · RUT · Email · Teléfono · Sector · Estado
 *
 * `DYNAMIC_FIELDS` está vacío en clientes —`ClientDTO` declara justo esos seis
 * campos más el `id`—, así que no hay columnas extra que seguir.
 *
 * Los dos campos calculados (`nombre_completo` y `estado`) se replican acá
 * porque los calcula el FRONTEND, no el serializer: `transform_item()` y
 * `_resolver_estado()` en `states/clients/client_table_state.py`. Si algún día
 * cambia la regla de "estado", hay que tocarla en los dos lados — está anotado
 * en el ROADMAP como parte del costo de exportar la vista y no la tabla.
 * ============================================================================
 */
export const COLUMNAS_CSV_CLIENTES: ColumnaCsv<ClienteConRelaciones>[] = [
  {
    encabezado: 'Nombre Completo',
    // Sin `nombre2` ni `nombre3`: `transform_item()` concatena exactamente
    // estos tres. Emitir el nombre completo "de verdad" haría que la columna
    // del CSV no coincidiera con la de la pantalla.
    valor: (cliente) =>
      [cliente.nombre1, cliente.apellido1, cliente.apellido2]
        .filter((parte) => parte && parte.trim() !== '')
        .join(' '),
  },
  { encabezado: 'RUT', valor: (cliente) => cliente.rut },
  { encabezado: 'Email', valor: (cliente) => cliente.email },
  // La tabla titula "Teléfono" lo que en la base es `tel`.
  { encabezado: 'Teléfono', valor: (cliente) => cliente.tel },
  {
    encabezado: 'Sector',
    // D4: el sector no es columna del cliente, sale de su dirección principal.
    // `CLIENTE_INCLUDE` ya la trae acotada con `take: 1`.
    valor: (cliente) => cliente.direcciones[0]?.sector?.sector ?? '',
  },
  { encabezado: 'Estado', valor: (cliente) => estadoDelCliente(cliente) },
];

/**
 * Mismo orden de precedencia que `_resolver_estado()` en el frontend: activo
 * gana sobre por_instalar, que gana sobre moroso, y si no hay ninguno es baja.
 *
 * Se emiten las etiquetas ya legibles —la tabla las muestra capitalizadas por
 * CSS— en vez del `por_instalar` crudo: en una planilla no hay hoja de estilos
 * que lo arregle.
 */
function estadoDelCliente(cliente: {
  activo: boolean;
  por_instalar: boolean;
  moroso: boolean;
}): string {
  if (cliente.activo) return 'Activo';
  if (cliente.por_instalar) return 'Por instalar';
  if (cliente.moroso) return 'Moroso';
  return 'Baja';
}
