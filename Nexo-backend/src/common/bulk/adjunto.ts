import { BadRequestException, NotImplementedException } from '@nestjs/common';

/**
 * ============================================================================
 * Respuestas de archivo y errores del dispatcher — Fase 9
 * ----------------------------------------------------------------------------
 * El frontend baja el archivo leyendo el nombre del header:
 *
 *   content_disposition.split("filename=")[-1].strip('"').strip()
 *
 * (`client_actions_state.py` y sus tres gemelos). O sea: **el nombre real del
 * archivo lo decide el backend**; el default del frontend
 * (`clientes_exportados.csv`) es solo el fallback si el header falta.
 * ============================================================================
 */

interface ResponseLike {
  setHeader(nombre: string, valor: string): unknown;
}

/**
 * Marca la respuesta como descarga con nombre.
 *
 * El nombre va entre comillas: sin ellas, un filename con espacios se corta en
 * el primer espacio en varios clientes. El `split("filename=")` del frontend
 * las saca con `.strip('"')`.
 */
export function comoAdjunto(
  res: ResponseLike,
  nombreDeArchivo: string,
  contentType: string,
): void {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${nombreDeArchivo}"`);
}

/**
 * `"clientes"` → `"clientes_2026-08-24.csv"`.
 *
 * La fecha va en el nombre porque estos archivos terminan todos en la carpeta
 * de Descargas: sin ella, el tercer export del día es `clientes (2).csv` y
 * nadie sabe cuál es cuál. Formato ISO para que ordenen bien por nombre.
 *
 * ⚠️ La fecha es **UTC**, no hora de Chile: un export a las 21:00 del 24 se
 * llama `..._2026-08-25.csv`. Es el mismo hueco de zona horaria que ya dejó
 * anotado la Fase 2 (ver `common/fechas.ts`) y se cierra junto con él, cuando
 * se decida la zona de toda la aplicación — no campo por campo.
 */
export function nombreConFecha(base: string, extension: string, hoy = new Date()): string {
  return `${base}_${hoy.toISOString().slice(0, 10)}.${extension}`;
}

/**
 * `action` que el dispatcher de esa entidad no conoce → 400 con forma DRF.
 *
 * Va por campo (`{action: [...]}`) y no como `{detail}` porque es un error de
 * lo que vino en el cuerpo, que es exactamente lo que DRF reporta así.
 */
export function accionNoSoportada(action: string): BadRequestException {
  return new BadRequestException({
    action: [`Acción no soportada: "${action}".`],
  });
}

/**
 * Acción que existe en el contrato pero todavía no se puede cumplir — hoy solo
 * `generar_voucher` / `eliminar_voucher`, bloqueadas por R2 (nadie documentó el
 * sistema externo de facturación).
 *
 * 501 y no 400: el problema no es lo que mandó el cliente, es que el servidor
 * no implementa esa función. El frontend lo muestra como "Error del servidor:
 * 501" —feo pero honesto— y el `detail` queda en los logs para quien depure.
 */
export function accionNoImplementada(action: string, motivo: string): NotImplementedException {
  return new NotImplementedException({
    detail: `La acción "${action}" no está disponible: ${motivo}`,
  });
}
