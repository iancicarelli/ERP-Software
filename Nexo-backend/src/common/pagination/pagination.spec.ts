import { lastValueFrom, of } from 'rxjs';

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  paginated,
  parsePagination,
} from './pagination';
import { PaginationInterceptor } from './pagination.interceptor';

describe('parsePagination', () => {
  it('usa los defaults cuando no viene nada', () => {
    expect(parsePagination({})).toEqual({
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    });
  });

  it('calcula skip/take a partir de page y page_size', () => {
    expect(parsePagination({ page: '3', page_size: '20' })).toEqual({
      page: 3,
      page_size: 20,
      skip: 40,
      take: 20,
    });
  });

  it('acepta `limit` como alias de `page_size`', () => {
    // El dashboard pide `limit=1` para quedarse solo con el `count`.
    expect(parsePagination({ limit: '1' })).toMatchObject({
      page_size: 1,
      take: 1,
    });
  });

  it('`page_size` gana sobre `limit` si vienen los dos', () => {
    expect(parsePagination({ page_size: '20', limit: '1' })).toMatchObject({
      page_size: 20,
    });
  });

  it('soporta el page_size 500 que piden los dropdowns', () => {
    expect(parsePagination({ page_size: '500' })).toMatchObject({
      page_size: 500,
    });
  });

  it('recorta un page_size excesivo en vez de fallar', () => {
    expect(parsePagination({ page_size: '999999' })).toMatchObject({
      page_size: MAX_PAGE_SIZE,
    });
  });

  it.each([['0'], ['-3'], ['abc'], ['']])(
    'cae al default con un page_size inválido (%s)',
    (raw) => {
      expect(parsePagination({ page_size: raw })).toMatchObject({
        page_size: DEFAULT_PAGE_SIZE,
      });
    },
  );

  it.each([['0'], ['-1'], ['abc']])(
    'cae a la página 1 con un page inválido (%s)',
    (raw) => {
      expect(parsePagination({ page: raw })).toMatchObject({ page: 1, skip: 0 });
    },
  );
});

describe('PaginationInterceptor', () => {
  const interceptor = new PaginationInterceptor();

  function contextFor(url: string) {
    const [path, search = ''] = url.split('?');
    const query = Object.fromEntries(new URLSearchParams(search));
    const request = {
      query,
      originalUrl: url,
      protocol: 'http',
      get: (name: string) => (name === 'host' ? 'backend:3001' : undefined),
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as never;
  }

  function run(url: string, payload: unknown) {
    return lastValueFrom(
      interceptor.intercept(contextFor(url), { handle: () => of(payload) }),
    );
  }

  it('devuelve exactamente las cuatro claves del contrato', async () => {
    const result = await run(
      '/api/clientes/?page=1&page_size=2',
      paginated(5, [{ id: 1 }, { id: 2 }]),
    );

    expect(Object.keys(result as object).sort()).toEqual([
      'count',
      'next',
      'previous',
      'results',
    ]);
    expect((result as { results: unknown[] }).results).toEqual([
      { id: 1 },
      { id: 2 },
    ]);
  });

  it('arma `next` y deja `previous` en null en la primera página', async () => {
    const result = (await run(
      '/api/clientes/?page=1&page_size=2',
      paginated(5, [{ id: 1 }, { id: 2 }]),
    )) as { count: number; next: string | null; previous: string | null };

    expect(result.count).toBe(5);
    expect(result.previous).toBeNull();
    expect(result.next).toBe('http://backend:3001/api/clientes/?page=2&page_size=2');
  });

  it('`next` es null en la última página', async () => {
    // De esto depende que los dropdowns dejen de paginar: leen
    // `has_more = data.get("next") is not None` en un while.
    const result = (await run(
      '/api/clientes/?page=3&page_size=2',
      paginated(5, [{ id: 5 }]),
    )) as { next: string | null; previous: string | null };

    expect(result.next).toBeNull();
    expect(result.previous).toBe(
      'http://backend:3001/api/clientes/?page=2&page_size=2',
    );
  });

  it('omite `page` en el `previous` que apunta a la primera página', async () => {
    const result = (await run(
      '/api/clientes/?page=2&page_size=2',
      paginated(5, [{ id: 3 }, { id: 4 }]),
    )) as { previous: string | null };

    expect(result.previous).toBe('http://backend:3001/api/clientes/?page_size=2');
  });

  it('conserva los filtros activos en las URLs de navegación', async () => {
    const result = (await run(
      '/api/clientes/?page=1&page_size=2&activo=true&zona=Sur',
      paginated(5, []),
    )) as { next: string | null };

    expect(result.next).toContain('activo=true');
    expect(result.next).toContain('zona=Sur');
    expect(result.next).toContain('page=2');
  });

  it('con count 0 no hay ni next ni previous', async () => {
    const result = (await run('/api/clientes/?page=1', paginated(0, []))) as {
      count: number;
      next: string | null;
      previous: string | null;
      results: unknown[];
    };

    expect(result).toEqual({ count: 0, next: null, previous: null, results: [] });
  });

  it('deja pasar intacto lo que no sea un listado paginado', async () => {
    const detail = { id: 1, rut: '16.204.579-2' };
    expect(await run('/api/clientes/1/', detail)).toBe(detail);
  });
});
