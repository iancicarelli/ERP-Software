import { Prisma } from '@prisma/client';

/**
 * ============================================================================
 * `clientes.monto_total` — la única definición
 * ----------------------------------------------------------------------------
 * `monto_total` es la suma de los montos de los servicios **activos** de un
 * cliente. Es un campo DERIVADO: nadie lo escribe a mano.
 *
 * **Por qué solo los activos:** un servicio dado de baja no se cobra. Es una
 * interpretación, no un dato del contrato: ni `DATABASE_SCHEMA.md` ni el
 * frontend definen qué suma `monto_total`. Si negocio dice que la baja no
 * descuenta hasta fin de mes, se cambia acá y en ningún otro lado — por eso
 * este archivo existe en vez de tener el `aggregate` repetido en dos servicios.
 *
 * ── D6 (decidida el 2026-08-11): derivado, no escribible ──
 * Hasta la Fase 6 el campo tenía dos fuentes que se pisaban: este cálculo, que
 * corre al mutar un servicio, y el `PUT /api/clientes/{id}/`, que lo aceptaba
 * del formulario. Guardar la ficha de un cliente revertía el cálculo al valor
 * que tuviera el input en pantalla.
 *
 * Se resolvió como `sector` y `zona` en D4: **el campo salió del
 * `ClienteWriteDto`**, así que el `whitelist: true` del `ValidationPipe` lo
 * descarta en silencio si el frontend lo manda (y lo manda: arrastra el objeto
 * tal como lo recibió). Rechazar la request rompería cada guardado.
 *
 * Y como el PUT ya no puede escribirlo, aprovecha para **recalcularlo**: la
 * ficha se autocorrige al guardarla. Eso hace innecesario un backfill de los
 * clientes que quedaron desincronizados antes de este cambio.
 *
 * Quiénes lo mantienen:
 *   · `ServiciosService` — alta, edición y baja de un servicio.
 *   · `ClientesService.actualizar()` — cada PUT de la ficha.
 *   · el alta de cliente NO: `monto_total` es `@default(0)` en el schema y un
 *     cliente nuevo todavía no tiene servicios.
 * ============================================================================
 */

/**
 * La suma, sin escribir nada. Separada de `recalcularMontoTotal()` porque el
 * PUT de clientes necesita el número para meterlo en el mismo `update` que ya
 * va a hacer, en vez de disparar un segundo UPDATE sobre la misma fila.
 */
export async function sumaDeServiciosActivos(
  tx: Prisma.TransactionClient,
  clienteId: number,
): Promise<number> {
  const { _sum } = await tx.servicio.aggregate({
    where: { cliente_id: clienteId, activo: true },
    _sum: { monto: true },
  });

  return _sum.monto ?? 0;
}

/**
 * Recálculo completo, no delta: un `SUM` no se puede desincronizar, un
 * acumulador sí. Va siempre dentro de la misma transacción que la escritura que
 * lo motivó.
 */
export async function recalcularMontoTotal(
  tx: Prisma.TransactionClient,
  clienteId: number,
): Promise<void> {
  await tx.cliente.update({
    where: { id: clienteId },
    data: { monto_total: await sumaDeServiciosActivos(tx, clienteId) },
  });
}
