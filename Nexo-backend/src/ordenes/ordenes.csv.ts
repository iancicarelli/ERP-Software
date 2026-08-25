import { ColumnaCsv, fechaHora, siNo, soloFecha } from '../common';
import { nombreDePersona, OrdenConRelaciones } from './ordenes.serializer';

/**
 * ============================================================================
 * Columnas del CSV de órdenes — Fase 9
 * ----------------------------------------------------------------------------
 * Replica la tabla de `/orders` (`MANUAL_HEADERS` en
 * `pages/work_orders/orders.py`), abriendo en columnas separadas las celdas que
 * la pantalla resuelve con iconos o con dos líneas apiladas:
 *
 *   | Cliente     | nombre + RUT           → Cliente · RUT
 *   | Tipo        | 3 iconos               → Contrato Nuevo · Migración · Traslado
 *   | Instalación | costo + estado de pago → Costo Instalación · Pago Instalación
 *   | Comisión    | 2 iconos               → Comisión · Comisión Pagada
 *   | Control     | 2 iconos               → Modificación de Plan · Orden
 *   | Fechas      | prog. + inst.          → Fecha Programada · Fecha Instalación
 *
 * Un icono no se puede escribir en una planilla, y "Sí/No" en una columna
 * propia además se puede filtrar y contar — que es para lo que alguien exporta.
 *
 * `DYNAMIC_FIELDS` está vacío en órdenes: `USED_FIELDS_IN_DESIGN` cubre los 25
 * campos de `OrderDTO`, así que no hay columnas extra que seguir.
 * ============================================================================
 */
export const COLUMNAS_CSV_ORDENES: ColumnaCsv<OrdenConRelaciones>[] = [
  { encabezado: 'KoboID', valor: (orden) => orden.koboid },
  { encabezado: 'F. Contrato', valor: (orden) => soloFecha(orden.fecha_contrato) },

  // ── "Cliente": la celda apila nombre y RUT ──
  {
    encabezado: 'Cliente',
    // Snapshot de la orden (D9), no el cliente vinculado: es lo que muestra la
    // tabla y lo que valía al momento de la orden.
    valor: (orden) =>
      [orden.nombre1, orden.apellido1, orden.apellido2]
        .filter((parte) => parte && parte.trim() !== '')
        .join(' '),
  },
  { encabezado: 'RUT', valor: (orden) => orden.rut },

  // ── "Tipo": tres iconos ──
  { encabezado: 'Contrato Nuevo', valor: (orden) => siNo(orden.contrato_nuevo) },
  { encabezado: 'Migración', valor: (orden) => siNo(orden.migracion) },
  { encabezado: 'Traslado', valor: (orden) => siNo(orden.traslado) },

  { encabezado: 'Servicio', valor: (orden) => orden.servicio?.servicio },
  { encabezado: 'Zona', valor: (orden) => orden.zona?.zona },
  { encabezado: 'Sector', valor: (orden) => orden.sector?.sector },
  { encabezado: 'Coordenadas', valor: (orden) => orden.coordenadas },

  // ── "Instalación": costo arriba, estado del pago abajo ──
  {
    encabezado: 'Costo Instalación',
    // Entero pelado: la tabla lo muestra como `$12.000`, pero un CSV con el
    // símbolo y el punto de miles entra a Excel como texto y no se puede sumar.
    valor: (orden) => orden.costo_instalacion,
  },
  {
    encabezado: 'Pago Instalación',
    // "Pagado"/"Pendiente" y no "Sí"/"No": son las palabras que la celda usa.
    valor: (orden) => (orden.pago_instalacion ? 'Pagado' : 'Pendiente'),
  },

  // ── "Comisión": dos iconos ──
  { encabezado: 'Comisión', valor: (orden) => siNo(orden.comision) },
  { encabezado: 'Comisión Pagada', valor: (orden) => siNo(orden.comision_pagada) },

  // ── "Control": modificación de plan + candado ──
  {
    encabezado: 'Modificación de Plan',
    valor: (orden) => siNo(orden.modificacion_plan),
  },
  {
    encabezado: 'Orden',
    // El candado del tooltip: "Orden Abierta" / "Orden Cerrada/Validada".
    valor: (orden) => (orden.abierto ? 'Abierta' : 'Cerrada'),
  },

  // ── "Fechas": programada y de instalación ──
  {
    encabezado: 'Fecha Programada',
    valor: (orden) => fechaHora(orden.fecha_programado),
  },
  {
    encabezado: 'Fecha Instalación',
    valor: (orden) => fechaHora(orden.fecha_instalado),
  },

  { encabezado: 'Técnico', valor: (orden) => nombreDePersona(orden.tecnico) },
  {
    encabezado: 'Estado',
    // La tabla pinta `estado.replace("_", " ")`; se replica para que
    // "en_terreno" no salga con guion bajo en la planilla.
    valor: (orden) => orden.estado?.estado.replace(/_/g, ' '),
  },
];
