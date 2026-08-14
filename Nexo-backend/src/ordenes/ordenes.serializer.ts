import { Prisma } from '@prisma/client';

import { fechaHora, soloFecha } from '../common';

/**
 * ============================================================================
 * Serialización de órdenes — Fase 7
 * ----------------------------------------------------------------------------
 * FUENTE: `dtos/work_orders/orders_table_dto.py` (tabla) y
 * `dtos/work_orders/order_detail_dto.py` (detalle).
 *
 * **DOS serializers, no uno.** Es la primera entidad donde hace falta: clientes
 * y servicios comparten uno porque la tabla pide un SUBCONJUNTO del detalle,
 * pero acá las dos vistas piden las mismas etiquetas con NOMBRES DISTINTOS
 * (ROADMAP §3.6 y riesgo R6):
 *
 *   | dato | tabla | detalle |
 *   |------|-------|---------|
 *   | estado  | `estado_estado`   | `estado_str`    |
 *   | servicio| `servicio_servicio` | `servicio_str` |
 *   | zona    | `zona_str`        | `zona_zona` + `zona_str` |
 *   | sector  | `sector_str`      | `sector_sector` + `sector_str` |
 *
 * La decisión del ROADMAP para R6 es **exponer ambos alias**, no elegir uno:
 * cada serializer emite los nombres de su vista y además los de la otra cuando
 * el DTO los declara. Sale gratis (son la misma etiqueta repetida) y evita que
 * un cambio de vista rompa la otra.
 *
 * ── Las FK viajan dos veces ──
 * El detalle emite cada FK como entero pelado (`servicio`, `estado`, `zona`,
 * `sector`, `vendedor`, `tecnico`, `causa`) **y** como etiqueta (`*_str`).
 * No es redundancia: `hook_process_data()` del frontend copia los enteros a
 * `*_id` (`orders_detail_state.py:44-56`) y el formulario usa los `*_str` para
 * pintar los `rx.select`. Si faltaran los enteros, los selects abrirían vacíos
 * y el PUT mandaría FKs en `null`.
 * ============================================================================
 */
export const ORDEN_INCLUDE = {
  estado: true,
  causa: true,
  servicio: true,
  vendedor: true,
  tecnico: true,
  zona: true,
  sector: true,
} satisfies Prisma.OrdenTrabajoInclude;

export type OrdenConRelaciones = Prisma.OrdenTrabajoGetPayload<{
  include: typeof ORDEN_INCLUDE;
}>;

/**
 * Serializer de la TABLA (`/orders`) — las claves que lee `OrderDTO`.
 *
 * `nombre_completo` NO se emite: lo arma `transform_item()` concatenando
 * `nombre1 + apellido1 + apellido2` (`orders_table_state.py`). Mandarlo sería
 * inventar una clave que el frontend pisa igual.
 */
export function serializarOrdenTabla(
  orden: OrdenConRelaciones,
): Record<string, unknown> {
  return {
    id: orden.id,
    koboid: orden.koboid,

    contrato_nuevo: orden.contrato_nuevo,
    fecha_contrato: soloFecha(orden.fecha_contrato),

    // Snapshot del cliente (D9). La tabla lo lee directo, sin join.
    rut: orden.rut,
    nombre1: orden.nombre1,
    apellido1: orden.apellido1,
    apellido2: orden.apellido2,

    modificacion_plan: orden.modificacion_plan,
    migracion: orden.migracion,
    traslado: orden.traslado,

    servicio_servicio: orden.servicio?.servicio ?? null,

    pago_instalacion: orden.pago_instalacion,
    costo_instalacion: orden.costo_instalacion,

    coordenadas: orden.coordenadas,

    abierto: orden.abierto,
    // `_resolver_estado()` hace `item.get("estado_estado") or item.get("estado")
    // or "pendiente"`: si esta clave viniera vacía, la columna Estado mostraría
    // "pendiente" para TODA la tabla.
    estado_estado: orden.estado?.estado ?? null,

    comision: orden.comision,
    comision_pagada: orden.comision_pagada,

    fecha_programado: fechaHora(orden.fecha_programado),
    fecha_instalado: fechaHora(orden.fecha_instalado),

    tecnico_str: nombreDePersona(orden.tecnico),
    zona_str: orden.zona?.zona ?? null,
    sector_str: orden.sector?.sector ?? null,
  };
}

/**
 * Serializer del DETALLE (`/order/detail`) — las claves de `OrderDetailDTO`.
 */
export function serializarOrdenDetalle(
  orden: OrdenConRelaciones,
): Record<string, unknown> {
  const estado = orden.estado?.estado ?? null;
  const causa = orden.causa?.causa ?? null;
  const servicio = orden.servicio?.servicio ?? null;
  const zona = orden.zona?.zona ?? null;
  const sector = orden.sector?.sector ?? null;

  return {
    id: orden.id,

    // ── Kobo ──
    // Se persisten desde la Fase 1 aunque la integración no exista. El
    // formulario los muestra en solo lectura.
    koboid: orden.koboid,
    koboid_serie: orden.koboid_serie,
    kobo_asset_uid: orden.kobo_asset_uid,
    kobo_submission_time: fechaHora(orden.kobo_submission_time),

    // ── Contrato ──
    contrato_nuevo: orden.contrato_nuevo,
    fecha_contrato: soloFecha(orden.fecha_contrato),

    // ── Cliente (snapshot, D9) ──
    rut: orden.rut,
    nombre1: orden.nombre1,
    apellido1: orden.apellido1,
    apellido2: orden.apellido2,
    email: orden.email,
    tel: orden.tel,

    // ── Tipo de orden ──
    modificacion_plan: orden.modificacion_plan,
    migracion: orden.migracion,
    traslado: orden.traslado,

    // ── Equipamiento ──
    anexos_extras: orden.anexos_extras,
    anexos_extras_exterior: orden.anexos_extras_exterior,
    sintonizadores: orden.sintonizadores,
    extensores_wifi: orden.extensores_wifi,

    // ── Costos ──
    metros_extras: orden.metros_extras,
    costo_metros_extras: orden.costo_metros_extras,
    pago_instalacion: orden.pago_instalacion,
    costo_instalacion: orden.costo_instalacion,
    monto: orden.monto,

    // ── Ubicación / instalación ──
    // `direccion` es TEXTO libre, no la FK: así lo declara el DTO y así lo
    // manda el PUT. `direccion_id` no se expone — es solo para reportería.
    direccion: orden.direccion,
    coordenadas: orden.coordenadas,
    medidor_luz: orden.medidor_luz,
    ducto: orden.ducto,
    metros_ducto: orden.metros_ducto,
    poda: orden.poda,
    vecino: orden.vecino,
    postacion: orden.postacion,
    postes: orden.postes,

    // ── Observaciones ──
    observacion_vendedor: orden.observacion_vendedor,
    observacion: orden.observacion,

    // ── Estado ──
    abierto: orden.abierto,
    evaluacion: orden.evaluacion,
    bienvenida: orden.bienvenida,

    // ── Comisión ──
    comision: orden.comision,
    comision_pagada: orden.comision_pagada,
    fecha_pago: soloFecha(orden.fecha_pago),

    // ── Fechas de gestión ──
    fecha_ingreso: soloFecha(orden.fecha_ingreso),
    fecha_programado: fechaHora(orden.fecha_programado),
    fecha_instalado: fechaHora(orden.fecha_instalado),

    // ── FKs como entero: las lee `hook_process_data()` y las copia a `*_id` ──
    servicio: orden.servicio_id,
    estado: orden.estado_id,
    causa: orden.causa_id,
    zona: orden.zona_id,
    sector: orden.sector_id,
    vendedor: orden.vendedor_id,
    tecnico: orden.tecnico_id,

    // ── Etiquetas: las pintan los `rx.select` del formulario ──
    servicio_str: servicio,
    estado_str: estado,
    causa_str: causa,
    vendedor_str: nombreDePersona(orden.vendedor),
    tecnico_str: nombreDePersona(orden.tecnico),
    tecnico2: orden.tecnico2,
    zona_str: zona,
    sector_str: sector,

    // ── Alias de la vista de tabla (R6) ──
    // El DTO del detalle declara `zona_zona` y `sector_sector` además de los
    // `*_str`, y la tabla lee `estado_estado` / `servicio_servicio`. Emitir los
    // cuatro cuesta nada y hace que las dos vistas nunca dependan de cuál
    // serializer las atendió.
    zona_zona: zona,
    sector_sector: sector,
    estado_estado: estado,
    servicio_servicio: servicio,
  };
}

/**
 * `"Cristian Quiroz"`. Devuelve `null` —no `""`— si no hay persona asignada:
 * `OrderDetailDTO.tecnico_str` es `Optional[str]`, así que el null pasa, y el
 * DTO de la tabla tiene `"Sin asignar"` como default… que Pydantic **solo**
 * aplica si la clave está ausente, no si vale `None`. Como igual es
 * `Optional[str]`, el null se acepta y se pinta vacío.
 */
function nombreDePersona(
  persona: { nombre1: string; apellido1: string; apellido2: string | null } | null,
): string | null {
  if (!persona) return null;

  return [persona.nombre1, persona.apellido1, persona.apellido2]
    .filter((parte) => parte && parte.trim() !== '')
    .join(' ');
}
