import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * ============================================================================
 * Paginación estilo DRF (ROADMAP §3.2)
 * ----------------------------------------------------------------------------
 * Todo listado responde:
 *
 *   { "count": 1234, "next": "…|null", "previous": "…|null", "results": [ … ] }
 *
 * Detalles del contrato que NO son negociables:
 *   - `next` debe ser `null` en la última página: el frontend lo usa como
 *     booleano (`_has_more = data.get("next") is not None`) y los dropdowns
 *     paginan en bucle hasta que sea `null` — si nunca lo fuera, bucle infinito.
 *   - `limit` es alias de `page_size`: el dashboard pide `limit=1` para
 *     quedarse solo con el `count`.
 *   - `page_size` alto tiene que funcionar: `FilterState` y los dropdowns piden
 *     500 por página.
 * ============================================================================
 */

export const DEFAULT_PAGE_SIZE = 50;

/**
 * Tope duro. 500 es lo que piden los dropdowns; el margen extra es para no
 * quedar justos si mañana crece un catálogo. Un `page_size` mayor se recorta
 * en silencio en vez de dar 400: el frontend no maneja ese error en listados.
 */
export const MAX_PAGE_SIZE = 1000;

export interface PaginationParams {
  page: number;
  page_size: number;
  /** Listo para pasar a Prisma. */
  skip: number;
  /** Listo para pasar a Prisma. */
  take: number;
}

/**
 * Interpreta `page` / `page_size` / `limit`. Los valores inválidos caen al
 * default en vez de dar error, igual que hace DRF con `page_size`.
 */
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = clamp(toPositiveInt(query.page) ?? 1, 1, Number.MAX_SAFE_INTEGER);

  const requested = toPositiveInt(query.page_size) ?? toPositiveInt(query.limit);
  const page_size = clamp(requested ?? DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);

  return {
    page,
    page_size,
    skip: (page - 1) * page_size,
    take: page_size,
  };
}

/** `@Pagination()` — inyecta los parámetros ya interpretados en el handler. */
export const Pagination = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PaginationParams =>
    parsePagination(ctx.switchToHttp().getRequest<{ query: Record<string, unknown> }>().query),
);

/**
 * Marcador que devuelve un handler de listado. El `PaginationInterceptor` lo
 * detecta y lo convierte en la respuesta DRF completa, que necesita la URL de
 * la request para armar `next` / `previous`.
 */
export class PaginatedPayload<T> {
  constructor(
    readonly count: number,
    readonly results: T[],
  ) {}
}

export function paginated<T>(count: number, results: T[]): PaginatedPayload<T> {
  return new PaginatedPayload(count, results);
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function toPositiveInt(raw: unknown): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
