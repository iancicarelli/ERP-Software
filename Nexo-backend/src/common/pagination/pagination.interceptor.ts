import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  PaginatedPayload,
  PaginatedResponse,
  parsePagination,
} from './pagination';

interface RequestLike {
  query: Record<string, unknown>;
  originalUrl?: string;
  url?: string;
  protocol?: string;
  get?(name: string): string | undefined;
}

/**
 * Convierte cualquier `PaginatedPayload` devuelto por un handler en la
 * respuesta DRF `{count, next, previous, results}`.
 *
 * Va como interceptor y no como helper porque `next`/`previous` son URLs
 * absolutas: hay que conocer la request, y los handlers no deberían tener que
 * recibirla solo para eso. Todo lo que no sea un `PaginatedPayload` pasa
 * intacto, así que registrarlo global no afecta a los endpoints de detalle.
 */
@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestLike>();

    return next.handle().pipe(
      map((value: unknown) =>
        value instanceof PaginatedPayload ? toDrfPage(request, value) : value,
      ),
    );
  }
}

function toDrfPage<T>(
  request: RequestLike,
  payload: PaginatedPayload<T>,
): PaginatedResponse<T> {
  const { page, page_size } = parsePagination(request.query ?? {});
  const totalPages = Math.ceil(payload.count / page_size);

  return {
    count: payload.count,
    next: page < totalPages ? pageUrl(request, page + 1) : null,
    previous: page > 1 ? pageUrl(request, page - 1) : null,
    results: payload.results,
  };
}

/**
 * Reescribe el `page` de la URL actual conservando todo lo demás (los filtros
 * activos, el `page_size`, el `format=json`…).
 *
 * Dentro de Docker el host es `backend:3001`, no `localhost`: el state de
 * Reflex corre server-side y llama por DNS de compose. Como el frontend solo
 * usa `next` para saber si hay más páginas, eso no molesta; se arma la URL
 * completa igual para que la respuesta sea DRF de verdad y sirva desde curl.
 */
function pageUrl(request: RequestLike, page: number): string {
  const path = request.originalUrl ?? request.url ?? '/';
  const host = request.get?.('host') ?? 'localhost';
  const protocol = request.protocol ?? 'http';

  const url = new URL(path, `${protocol}://${host}`);
  if (page <= 1) {
    // DRF omite `page=1` en `previous`.
    url.searchParams.delete('page');
  } else {
    url.searchParams.set('page', String(page));
  }
  return url.toString();
}
