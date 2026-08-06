import { Prisma } from '@prisma/client';

/**
 * ============================================================================
 * Serialización de direcciones — Fase 5
 * ----------------------------------------------------------------------------
 * FUENTE: `dtos/addresses/direction_detail_dto.py` (detalle) y
 * `DirectionTableState.transform_item()` (tabla del detalle de cliente).
 *
 * Un solo serializer: la tabla lee `direccion`, `sector_str`, `sector_zona`,
 * `activo`, `principal` y `monto`, que son un subconjunto del detalle.
 *
 * OJO con los nombres: la FK del cliente se expone como **`cliente`** (id
 * plano) y no como `cliente_id`, porque así la manda el frontend en el
 * `post_payload` y así la lee el DTO. Lo mismo con `sector`.
 * ============================================================================
 */
export const DIRECCION_INCLUDE = {
  cliente: true,
  sector: { include: { zona: true } },
} satisfies Prisma.DireccionInclude;

export type DireccionConRelaciones = Prisma.DireccionGetPayload<{
  include: typeof DIRECCION_INCLUDE;
}>;

export function serializarDireccion(
  direccion: DireccionConRelaciones,
): Record<string, unknown> {
  const { cliente, sector } = direccion;

  return {
    id: direccion.id,
    activo: direccion.activo,
    principal: direccion.principal,
    contrato: direccion.contrato,
    sucursal: direccion.sucursal,
    direccion: direccion.direccion,
    coordenadas: direccion.coordenadas,
    monto: direccion.monto,

    // FK del cliente + sus etiquetas. `DirectionDetailDTO` convierte los null
    // a "" con un validator, así que devolverlos en null es correcto.
    cliente: direccion.cliente_id,
    cliente_rut: cliente.rut,
    cliente_str: nombreCompleto(cliente),

    // FK del sector + etiquetas. `sector_zona` es el NOMBRE de la zona, no su
    // id: la tabla del detalle de cliente lo pinta en la columna "Zona".
    sector: direccion.sector_id,
    sector_str: sector?.sector ?? null,
    sector_zona: sector?.zona.zona ?? null,
  };
}

/** `"Juan Pedro Pérez Soto"`, igual que lo arma el frontend. */
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
