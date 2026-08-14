import { Prisma } from '@prisma/client';

/**
 * ============================================================================
 * Serialización de notas de orden — Fase 7
 * ----------------------------------------------------------------------------
 * FUENTE: `dtos/work_orders/nota_dto.py`. De las 7 claves, la UI pinta tres
 * (`added_by_username`, `fecha_creacion`, `nota` — ver
 * `components/forms/order_notas_component.py`), pero el DTO de Pydantic valida
 * el objeto entero: una clave con el tipo equivocado rompe la carga de TODAS
 * las notas, no solo de esa.
 * ============================================================================
 */
export const NOTA_INCLUDE = {
  added_by: true,
  orden_trabajo: { select: { id: true, rut: true, nombre1: true, apellido1: true } },
} satisfies Prisma.NotaOrdenInclude;

export type NotaConRelaciones = Prisma.NotaOrdenGetPayload<{
  include: typeof NOTA_INCLUDE;
}>;

export function serializarNota(nota: NotaConRelaciones): Record<string, unknown> {
  const { orden_trabajo, added_by } = nota;

  return {
    id: nota.id,
    orden_trabajo: nota.orden_trabajo_id,

    // Etiqueta de la orden. No se pinta hoy, pero el DTO la declara y §3.6 la
    // lista entre los campos denormalizados esperados.
    orden_trabajo_str: `#${orden_trabajo.id} — ${orden_trabajo.nombre1} ${orden_trabajo.apellido1} (${orden_trabajo.rut})`,

    nota: nota.nota,

    // ISO completo. El frontend lo parte a mano
    // (`fc[:10] + " " + fc[11:16]` en `load_notas_for_current_order`), así que
    // la `T` tiene que estar: sin ella, la hora se corta mal y sale texto roto.
    fecha_creacion: nota.fecha_creacion.toISOString(),

    // `added_by_id` es `SetNull`: si se borra el usuario, la nota sobrevive sin
    // autor. `NotaDTO.added_by_username` es `Optional[str]`, así que el null
    // pasa la validación y el componente lo pinta vacío.
    added_by: nota.added_by_id,
    added_by_username: added_by?.username ?? null,
  };
}
