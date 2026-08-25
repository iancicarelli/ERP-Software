import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

/**
 * ============================================================================
 * Cuerpo de `POST /api/{entidad}/bulk-action/` — Fase 9 (ROADMAP §3.9)
 * ----------------------------------------------------------------------------
 * FUENTE: `BaseActionsState.build_bulk_payload()`
 * (`states/base/base_actions_state.py`). Las cuatro pantallas con selección
 * masiva mandan exactamente el mismo cuerpo:
 *
 *   { "action": "exportar_clientes_csv", "selected_ids": [1, 2, 3] }
 *
 * Un solo DTO para las cuatro entidades: lo que cambia entre ellas es qué
 * `action` acepta el dispatcher, no la forma del cuerpo.
 * ============================================================================
 */

/**
 * Tope duro de la selección masiva — cierra R7.
 *
 * El frontend selecciona sin límite: `trigger_select_all` pide `all-ids` (que
 * tampoco pagina) y mete TODO en `selected_ids`. Con la tabla llena eso son
 * decenas de miles de enteros en el cuerpo de un POST, un `IN (…)` gigante en
 * Postgres y un CSV que el cliente abandona a los 120s.
 *
 * 10.000 es holgado para el uso real (un año de órdenes ronda los miles) y a la
 * vez chico para que el error salga en el pipe de validación, antes de tocar la
 * base. El mensaje va en castellano y por campo porque el frontend lo pinta
 * como viene.
 */
export const MAX_SELECCION = 10_000;

export class BulkActionDto {
  @IsString({ message: 'Este campo debe ser texto.' })
  @IsNotEmpty({ message: 'Este campo no puede estar vacío.' })
  action: string;

  @IsArray({ message: 'Este campo debe ser una lista.' })
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos un registro.' })
  @ArrayMaxSize(MAX_SELECCION, {
    message: `No se pueden procesar más de ${MAX_SELECCION} registros a la vez. Achicá la selección con los filtros.`,
  })
  @IsInt({ each: true, message: 'Cada id debe ser un número entero.' })
  @Min(1, { each: true, message: 'Cada id debe ser un número positivo.' })
  selected_ids: number[];
}
