import { Prisma } from '@prisma/client';

import { soloFecha } from '../common';

/**
 * ============================================================================
 * Serialización de transferencias — Fase 8
 * ----------------------------------------------------------------------------
 * FUENTE: `TransferTableState.transform_item()` y `TransferenciaDTO`
 * (`dtos/transfers/transfers_table_dto.py`).
 *
 * Acá no hay doble alias: el frontend lee todo en snake_case. La única
 * traducción es la de siempre —`null` no puede salir— porque `TransferenciaDTO`
 * declara los campos como `str`/`bool` pelados y `transform_item()` los protege
 * con `or ""`, que cubre el `None` pero no lo hace válido si Pydantic lo
 * recibiera por otro camino.
 *
 * Dos campos con forma propia:
 *
 *   · `monto` sale como ENTERO aunque el DTO lo declare `str`. `transform_item`
 *     hace `str(item.get("monto", "0"))`, así que convierte lo que llegue;
 *     mandar el número respeta D5 (montos enteros en CLP) y no obliga a nadie
 *     a parsear texto para sumar.
 *
 *   · `voucher_generado` sale como `""` cuando no hay voucher. Lo produce
 *     `generar_voucher`, que es de la Fase 9 y está bloqueado por R2: hasta
 *     entonces la columna existe y siempre vale `null`.
 * ============================================================================
 */
export const TRANSFERENCIA_INCLUDE = {
  cliente: {
    include: {
      direcciones: {
        where: { principal: true },
        include: { sector: { include: { zona: true } } },
        take: 1,
      },
    },
  },
} satisfies Prisma.TransferenciaInclude;

export type TransferenciaConRelaciones = Prisma.TransferenciaGetPayload<{
  include: typeof TRANSFERENCIA_INCLUDE;
}>;

export function serializarTransferencia(
  transferencia: TransferenciaConRelaciones,
): Record<string, unknown> {
  const { cliente } = transferencia;
  const principal = cliente?.direcciones[0];

  return {
    id: transferencia.id,

    fecha: soloFecha(transferencia.fecha) ?? '',

    // Mismo predicado que el filtro `cliente_existe`.
    cliente_existe: transferencia.cliente_id !== null,
    cliente: transferencia.cliente_id ?? 0,
    cliente_str: cliente ? nombreCompleto(cliente) : '',
    cliente_sector: principal?.sector?.sector ?? '',
    cliente_zona: principal?.sector?.zona?.zona ?? '',

    rut_transferencia: transferencia.rut_transferencia ?? '',
    nombre: transferencia.nombre ?? '',
    banco_origen: transferencia.banco_origen ?? '',
    cuenta_destino: transferencia.cuenta_destino ?? '',
    monto: transferencia.monto,

    /**
     * `transform_item()` hace `item.get("estado") or "Pendiente"`: una
     * transferencia sin estado se pinta como "Pendiente" en la tabla. Acá sale
     * `""` y no `"Pendiente"` a propósito — inventar el literal en el backend
     * lo volvería un valor real, filtrable por `estado=Pendiente`, cuando en la
     * base no hay tal cosa. La etiqueta es decisión de la vista.
     */
    estado: transferencia.estado ?? '',

    codigo_transferencia: transferencia.codigo_transferencia ?? '',
    voucher_generado: transferencia.voucher_generado ?? '',

    documento_pagado: transferencia.documento_pagado,
    documento_venta: transferencia.documento_venta ?? '',
    documento_vencimiento: soloFecha(transferencia.documento_vencimiento) ?? '',
  };
}

/** `"Juan Pedro Pérez Soto"`, igual que en los otros serializers. */
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
