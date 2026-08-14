import { Prisma } from '@prisma/client';

import { soloFecha } from '../common';

/**
 * ============================================================================
 * Serialización de pagos — Fase 8
 * ----------------------------------------------------------------------------
 * FUENTE de las claves: `PaymentTableState.transform_item()`
 * (`states/payments/payment_table_state.py`) y `PaymentDTO`
 * (`dtos/payments/payment_table_dto.py`).
 *
 * ── POR QUÉ HAY CLAVES REPETIDAS EN DOS FORMATOS ──
 * `transform_item()` lee NUEVE campos en camelCase:
 *
 *   voucherRut · voucherType · voucherNumber · fiscalYear · entryUser
 *   folioNumber · entryDate · expirationDate · documentType
 *
 * y el resto en snake_case (`id`, `cliente_str`, `cliente_rut`, `credit`,
 * `date`, `cliente_existe`, `cliente_sector`). Emitir solo snake_case dejaría
 * esas nueve columnas en blanco en `/payments`, porque el `.get()` cae al
 * default sin avisar.
 *
 * Se emiten **los dos alias**, que es la mitigación que el ROADMAP ya adoptó
 * para R6 (`estado_estado` vs `estado_str` en órdenes): el camelCase existe
 * porque el frontend lo exige hoy; el snake_case porque es lo que manda D2 y lo
 * que va a esperar cualquier consumidor nuevo. El día que el frontend se
 * normalice, se borran nueve líneas de acá y nada más.
 *
 * ── NINGÚN CAMPO SALE EN `null` ──
 * Misma trampa que en servicios, y acá muerde más fuerte porque `PaymentDTO`
 * declara tres enteros pelados (`voucher_number`, `fiscal_year`, `credit`).
 * `transform_item()` hace `item.get("voucherNumber", 0)`: ese default cubre la
 * clave AUSENTE, no la clave presente con `None`. Un `null` en la respuesta
 * llega como `None` a Pydantic, revienta la validación y la tabla entera queda
 * vacía. Por eso los enteros opcionales salen en `0` y los textos en `""`.
 * ============================================================================
 */

/**
 * La dirección principal es la que define sector y zona del cliente (D4). Se
 * pide `take: 1` porque solo una puede ser principal y no hace falta traer el
 * resto para pintar una etiqueta.
 */
export const PAGO_INCLUDE = {
  cliente: {
    include: {
      direcciones: {
        where: { principal: true },
        include: { sector: { include: { zona: true } } },
        take: 1,
      },
    },
  },
} satisfies Prisma.PagoInclude;

export type PagoConRelaciones = Prisma.PagoGetPayload<{
  include: typeof PAGO_INCLUDE;
}>;

export function serializarPago(pago: PagoConRelaciones): Record<string, unknown> {
  const { cliente } = pago;
  const principal = cliente?.direcciones[0];

  return {
    id: pago.id,

    // Calculado, no columna. Es el mismo predicado que aplica el filtro
    // homónimo en `pagos.filters.ts`: si los dos divergieran, filtrar por
    // "Cliente Existe = Si" devolvería filas con el chip en "No".
    cliente_existe: pago.cliente_id !== null,
    cliente: pago.cliente_id ?? 0,
    cliente_str: cliente ? nombreCompleto(cliente) : '',

    // Snapshot, no `cliente.rut`: en un pago sin conciliar es el único rastro
    // de a quién pertenece.
    cliente_rut: pago.cliente_rut ?? '',

    cliente_sector: principal?.sector?.sector ?? '',
    cliente_zona: principal?.sector?.zona?.zona ?? '',

    date: soloFecha(pago.date) ?? '',
    credit: pago.credit,

    // ── Los nueve con doble alias (ver cabecera) ──
    voucherRut: pago.voucher_rut ?? '',
    voucher_rut: pago.voucher_rut ?? '',

    voucherType: pago.voucher_type ?? '',
    voucher_type: pago.voucher_type ?? '',

    voucherNumber: pago.voucher_number ?? 0,
    voucher_number: pago.voucher_number ?? 0,

    fiscalYear: pago.fiscal_year ?? 0,
    fiscal_year: pago.fiscal_year ?? 0,

    entryDate: soloFecha(pago.entry_date) ?? '',
    entry_date: soloFecha(pago.entry_date) ?? '',

    entryUser: pago.entry_user ?? '',
    entry_user: pago.entry_user ?? '',

    documentType: pago.document_type ?? '',
    document_type: pago.document_type ?? '',

    folioNumber: pago.folio_number ?? '',
    folio_number: pago.folio_number ?? '',

    expirationDate: soloFecha(pago.expiration_date) ?? '',
    expiration_date: soloFecha(pago.expiration_date) ?? '',
  };
}

/** `"Juan Pedro Pérez Soto"`, igual que en el serializer de servicios. */
function nombreCompleto(cliente: {
  nombre1: string;
  nombre2: string | null;
  apellido1: string;
  apellido2: string | null;
}): string {
  return [cliente.nombre1, cliente.nombre2, cliente.apellido1, cliente.apellido2]
    .filter((parte) => parte && parte.trim() !== '')
    .join(' ');
}
