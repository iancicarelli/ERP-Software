/**
 * ============================================================================
 * Formateo de fechas para las respuestas de la API
 * ----------------------------------------------------------------------------
 * Prisma devuelve `Date` y `JSON.stringify` lo emitiría como
 * `"2026-08-04T00:00:00.000Z"`. Los inputs del navegador no aceptan ese
 * formato: `<input type="date">` quiere `YYYY-MM-DD` y
 * `<input type="datetime-local">` quiere `YYYY-MM-DDTHH:MM`.
 *
 * El frontend recorta por las suyas (`hook_process_data()` trunca a 10 o a 16
 * según el campo), pero mandar una fecha con hora y zona en un campo que no las
 * tiene es mentir sobre el dato.
 * ============================================================================
 */

/** `Date` → `"YYYY-MM-DD"`. Para columnas `@db.Date`. */
export function soloFecha(fecha: Date | null): string | null {
  return fecha ? fecha.toISOString().slice(0, 10) : null;
}

/**
 * `Date` → `"YYYY-MM-DDTHH:MM"`. Para las columnas `@db.Timestamptz` que el
 * frontend renderiza como `datetime-local` (`fecha_programado`) o como `date`
 * truncando (`fecha_instalado`, `kobo_submission_time`).
 *
 * ⚠️ **Se emite en UTC, sin convertir a hora de Chile.** No es un descuido: el
 * `datetime-local` manda de vuelta un string sin zona (`"2026-08-11T14:30"`),
 * que se guarda tal cual, así que lo que el usuario escribe es lo que después
 * lee — el round-trip es exacto. Tratarlo como hora de Chile al leer y no al
 * escribir correría el valor 3 o 4 horas en cada guardado.
 *
 * La contra es que el instante guardado no es el instante UTC real, lo que
 * importa para los filtros por rango de fecha. Es el mismo hueco de zona
 * horaria que ya dejó anotado la Fase 2: se cierra cuando haya datos reales y
 * se decida la zona de toda la aplicación, no campo por campo.
 */
export function fechaHora(fecha: Date | null): string | null {
  return fecha ? fecha.toISOString().slice(0, 16) : null;
}
