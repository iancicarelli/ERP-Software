import { Prisma } from '@prisma/client';

import { soloFecha } from '../common';

/**
 * ============================================================================
 * Serialización de clientes — Fase 5
 * ----------------------------------------------------------------------------
 * FUENTE de las claves: `dtos/clients/client_detail_dto.py` (detalle) y
 * `ClientTableState.transform_item()` (tabla).
 *
 * **Un solo serializer para tabla y detalle**, a diferencia de lo que va a
 * necesitar órdenes en la Fase 7. Motivo: la tabla de clientes no pide claves
 * distintas, pide un SUBCONJUNTO — `id`, `rut`, `nombre1`, `apellido1`,
 * `apellido2`, `email`, `tel`, `sector`, `activo`, `por_instalar`, `moroso` —
 * y ese subconjunto ya incluye `sector`, que es la parte cara (join con la
 * dirección principal). Partirlo en dos ahorraría el join de `causa_de_baja` y
 * traería el riesgo permanente de que las dos versiones se desincronicen.
 * ============================================================================
 */

/**
 * `direcciones` viene acotado a la principal (`take: 1`): de ahí salen `sector`
 * y `zona`, que por D4 NO son columnas del cliente.
 */
export const CLIENTE_INCLUDE = {
  causa_de_baja: true,
  direcciones: {
    where: { principal: true },
    take: 1,
    include: { sector: { include: { zona: true } } },
  },
} satisfies Prisma.ClienteInclude;

export type ClienteConRelaciones = Prisma.ClienteGetPayload<{
  include: typeof CLIENTE_INCLUDE;
}>;

export function serializarCliente(
  cliente: ClienteConRelaciones,
): Record<string, unknown> {
  const principal = cliente.direcciones[0];
  const sector = principal?.sector ?? null;

  return {
    id: cliente.id,
    rut: cliente.rut,
    rut_validado: cliente.rut_validado,

    nombre1: cliente.nombre1,
    nombre2: cliente.nombre2,
    nombre3: cliente.nombre3,
    apellido1: cliente.apellido1,
    apellido2: cliente.apellido2,

    email: cliente.email,
    tel: cliente.tel,

    co_titular1: cliente.co_titular1,
    co_titular2: cliente.co_titular2,

    // D4 — derivados de solo lectura. Si el cliente no tiene dirección
    // principal van en `null`, y el frontend los pinta vacíos.
    sector: sector?.sector ?? null,
    zona: sector?.zona.zona ?? null,

    activo: cliente.activo,
    por_instalar: cliente.por_instalar,
    moroso: cliente.moroso,
    moroso_desde: soloFecha(cliente.moroso_desde),

    deuda: cliente.deuda,
    monto_total: cliente.monto_total,

    krill: cliente.krill,
    defontana: cliente.defontana,
    zammad: cliente.zammad,

    cpes_todos: cliente.cpes_todos,
    cpes_inactivos: cliente.cpes_inactivos,

    fecha_creacion: soloFecha(cliente.fecha_creacion),
    fecha_de_baja: soloFecha(cliente.fecha_de_baja),
    // `causa_de_baja` es el ID (el frontend lo manda de vuelta al guardar) y
    // `causa_de_baja_str` la etiqueta que muestra el `rx.select`.
    causa_de_baja: cliente.causa_de_baja_id,
    causa_de_baja_str: cliente.causa_de_baja?.causa ?? null,

    donacion: cliente.donacion,
    analogo: cliente.analogo,
    corte_poste: cliente.corte_poste,
    baja_por_renuncia: cliente.baja_por_renuncia,
    baja_por_morosidad: cliente.baja_por_morosidad,
  };
}

// `soloFecha()` se mudó a `common/fechas.ts` en la Fase 7: órdenes lo necesita
// y además agrega la variante con hora (`fechaHora`). Se sigue re-exportando
// desde acá porque los tests de la Fase 5 lo importan de este módulo.
export { soloFecha };
