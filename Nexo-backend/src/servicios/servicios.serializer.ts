import { Prisma } from '@prisma/client';

/**
 * ============================================================================
 * Serialización de servicios — Fase 6
 * ----------------------------------------------------------------------------
 * FUENTE de las claves: `dtos/service/service_detail_dto.py` (detalle),
 * `ServiceTableState.transform_item()` (tabla de `/service`) y
 * `ClientTableServiceState.transform_item()` (tabla del detalle de cliente).
 *
 * **Un solo serializer para los tres.** Las dos tablas leen subconjuntos del
 * detalle, sin renombrar nada:
 *   - `/service`         → `cliente_rut`, `cliente_str`, `elemento_elemento`,
 *                          `direccion_str`, `cantidad`, `monto`, `activo`
 *   - detalle de cliente → `activo`, `elemento_elemento`, `cantidad`, `monto`,
 *                          `personalizado`, `direccion_str`
 *
 * (`ClientTableServiceState.transform_item()` arma también claves `elemento` y
 * `direccion` con el LABEL adentro, pero `ClientTableServiceDTO` no las declara
 * y Pydantic las descarta. Son código muerto del frontend: lo que se pinta sale
 * de `elemento_elemento` y `direccion_str`, que llegan por el fallback que
 * copia campo a campo desde el item crudo.)
 *
 * ── NINGÚN CAMPO SALE EN `null` ──
 * A diferencia de `DirectionDetailDTO`, **`ServiceDetailDTO` no tiene
 * validators que conviertan `null` a `""`**: son campos pelados con default
 * (`direccion: int = 0`, `direccion_str: str = ""`). Un `null` en la respuesta
 * revienta la validación de Pydantic y el detalle no carga. Por eso las FK
 * opcionales salen en `0` y las etiquetas en `""` — exactamente los mismos
 * valores que usa `init_new_service()` del frontend para un servicio en blanco.
 *
 * Lo mismo vale para la tabla: `transform_item()` hace
 * `item.get("cliente_rut", "S/I")`, que solo cubre la clave AUSENTE. Si la
 * clave está con `None`, el default no se aplica y `rut: str` falla igual.
 * ============================================================================
 */
export const SERVICIO_INCLUDE = {
  cliente: true,
  direccion: true,
  elemento: true,
} satisfies Prisma.ServicioInclude;

export type ServicioConRelaciones = Prisma.ServicioGetPayload<{
  include: typeof SERVICIO_INCLUDE;
}>;

export function serializarServicio(
  servicio: ServicioConRelaciones,
): Record<string, unknown> {
  const { cliente, direccion, elemento } = servicio;

  return {
    id: servicio.id,
    activo: servicio.activo,
    cantidad: servicio.cantidad,
    monto: servicio.monto,
    personalizado: servicio.personalizado,

    // FK como id plano (`cliente`, no `cliente_id`): así la manda el frontend
    // en el payload y así la lee el DTO.
    cliente: servicio.cliente_id,
    cliente_rut: cliente.rut,
    cliente_str: nombreCompleto(cliente),

    // `direccion_id` es la única FK nullable del modelo (`SetNull` cuando se
    // borra la dirección). Ver la nota de arriba sobre por qué 0 y "".
    direccion: servicio.direccion_id ?? 0,
    direccion_str: direccion?.direccion ?? '',

    elemento: servicio.elemento_id,
    elemento_elemento: elemento.elemento,
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
