import { ColumnaCsv, siNo, soloFecha } from '../common';
import { nombreCompleto, PagoConRelaciones } from './pagos.serializer';

/**
 * ============================================================================
 * Columnas del CSV de pagos — Fase 9
 * ----------------------------------------------------------------------------
 * Replica la tabla de `/payments` (`pages/management/payments/payment.py`), con
 * una diferencia obligada: **las celdas compuestas se abren en dos columnas**.
 *
 * La pantalla apila dos datos en una sola celda para ahorrar ancho:
 *
 *   | Identificación (RUT) | → "Cliente: 16.204.579-2" / "Voucher: 16.204.579-2"
 *   | Control Fechas       | → "Ing: 2026-08-14"       / "Ven: 2026-09-13"
 *
 * En una planilla eso no sirve: si se emitieran juntas, nadie podría filtrar
 * por fecha de vencimiento ni ordenar por RUT. Se abren en `RUT Cliente` /
 * `RUT Voucher` y `Fecha Ingreso` / `Fecha Vencimiento`, en la posición que
 * ocupaba la celda compuesta.
 *
 * Los encabezados de las últimas siete columnas están en spanglish
 * (`Voucher Type`, `Fiscal Year`…) a propósito: son los que el usuario ve en la
 * tabla, que los arma con `f.replace("_", " ").title()` sobre los campos de
 * `PaymentDTO`. Traducirlos acá haría que el CSV no se pareciera a la pantalla.
 * ============================================================================
 */
export const COLUMNAS_CSV_PAGOS: ColumnaCsv<PagoConRelaciones>[] = [
  {
    encabezado: 'Existe',
    // Mismo predicado que el serializer y que el filtro `cliente_existe`: un
    // pago está conciliado si tiene cliente asignado.
    valor: (pago) => siNo(pago.cliente_id !== null),
  },
  {
    encabezado: 'Cliente',
    valor: (pago) => (pago.cliente ? nombreCompleto(pago.cliente) : ''),
  },
  // ── "Identificación (RUT)", abierta en dos ──
  {
    encabezado: 'RUT Cliente',
    // El snapshot del pago, no `cliente.rut`: en un pago sin conciliar es el
    // único rastro de a quién pertenece.
    valor: (pago) => pago.cliente_rut,
  },
  { encabezado: 'RUT Voucher', valor: (pago) => pago.voucher_rut },

  { encabezado: 'Fecha', valor: (pago) => soloFecha(pago.date) },

  // ── "Control Fechas", abierta en dos ──
  { encabezado: 'Fecha Ingreso', valor: (pago) => soloFecha(pago.entry_date) },
  {
    encabezado: 'Fecha Vencimiento',
    valor: (pago) => soloFecha(pago.expiration_date),
  },

  {
    encabezado: 'Monto',
    // Entero pelado, sin `$` ni separador de miles: la tabla lo formatea para
    // leerlo, pero en el CSV eso lo convertiría en texto y Excel no podría
    // sumar la columna.
    valor: (pago) => pago.credit,
  },

  // ── Las dinámicas, en el orden en que las emite `DYNAMIC_FIELDS` ──
  { encabezado: 'Voucher Type', valor: (pago) => pago.voucher_type },
  { encabezado: 'Voucher Number', valor: (pago) => pago.voucher_number },
  { encabezado: 'Fiscal Year', valor: (pago) => pago.fiscal_year },
  { encabezado: 'Entry User', valor: (pago) => pago.entry_user },
  { encabezado: 'Document Type', valor: (pago) => pago.document_type },
  { encabezado: 'Folio Number', valor: (pago) => pago.folio_number },
  {
    encabezado: 'Cliente Sector',
    valor: (pago) => pago.cliente?.direcciones[0]?.sector?.sector ?? '',
  },
];
