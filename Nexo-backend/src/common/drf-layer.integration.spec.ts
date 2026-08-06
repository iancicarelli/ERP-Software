import {
  Body,
  Controller,
  Get,
  INestApplication,
  Logger,
  Module,
  Post,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IsNotEmpty, IsString } from 'class-validator';

import { configureDrfLayer } from './drf-layer';
import { paginated, Pagination, PaginationParams } from './pagination/pagination';

/**
 * ============================================================================
 * Test de integración de la capa DRF sobre HTTP real.
 * ----------------------------------------------------------------------------
 * Los tests unitarios prueban cada pieza por separado; este prueba que estén
 * BIEN ENCHUFADAS: prefijo `/api`, trailing slash, paginación, validación y
 * errores, todo junto y por la red.
 *
 * Monta un controlador descartable —no existe en la app real— sobre la misma
 * `configureDrfLayer()` que usa `main.ts`.
 * ============================================================================
 */

class DemoDto {
  @IsString()
  @IsNotEmpty()
  rut: string;
}

@Controller('demo')
class DemoController {
  private static readonly ROWS = Array.from({ length: 7 }, (_, i) => ({ id: i + 1 }));

  @Get()
  list(@Pagination() page: PaginationParams) {
    return paginated(
      DemoController.ROWS.length,
      DemoController.ROWS.slice(page.skip, page.skip + page.take),
    );
  }

  @Get('detalle')
  detail() {
    return { id: 1, rut: '16.204.579-2' };
  }

  @Post()
  create(@Body() dto: DemoDto) {
    return dto;
  }

  @Get('boom')
  boom(): never {
    throw new Error('kaboom');
  }
}

@Module({ controllers: [DemoController] })
class DemoModule {}

describe('Capa DRF sobre HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    app = await NestFactory.create(DemoModule, { logger: false });
    app.setGlobalPrefix('api');
    configureDrfLayer(app);

    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });

  interface DrfBody {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: unknown[];
    detail?: string;
    rut?: string[];
    id?: number;
  }

  const get = (path: string) => fetch(`${baseUrl}${path}`);
  const bodyOf = async (response: Response): Promise<DrfBody> =>
    (await response.json()) as DrfBody;

  describe('paginación', () => {
    it('responde `{count, next, previous, results}`', async () => {
      const response = await get('/api/demo/?page=1&page_size=3');
      const body = await bodyOf(response);

      expect(response.status).toBe(200);
      expect(body.count).toBe(7);
      expect(body.previous).toBeNull();
      expect(body.next).toContain('page=2');
      expect(body.results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('`next` es null en la última página', async () => {
      const body = await bodyOf(await get('/api/demo/?page=3&page_size=3'));

      expect(body.results).toEqual([{ id: 7 }]);
      expect(body.next).toBeNull();
      expect(body.previous).toContain('page=2');
    });

    it('acepta `limit` como alias de `page_size`', async () => {
      const body = await bodyOf(await get('/api/demo/?limit=1'));

      expect(body.count).toBe(7);
      expect(body.results).toHaveLength(1);
    });

    it('acepta el page_size 500 de los dropdowns', async () => {
      const body = await bodyOf(await get('/api/demo/?page_size=500'));

      expect(body.results).toHaveLength(7);
      expect(body.next).toBeNull();
    });

    it('no envuelve las respuestas de detalle', async () => {
      const body = await bodyOf(await get('/api/demo/detalle/'));

      expect(body).toEqual({ id: 1, rut: '16.204.579-2' });
    });
  });

  describe('trailing slash', () => {
    it('la ruta con slash final responde igual y sin redirect', async () => {
      const response = await get('/api/demo/?page=1&page_size=3');

      expect(response.status).toBe(200);
      expect(response.redirected).toBe(false);
    });

    it('la ruta sin slash final también responde', async () => {
      expect((await get('/api/demo?page=1&page_size=3')).status).toBe(200);
    });
  });

  describe('errores', () => {
    it('validación fallida → 400 con `campo: [mensajes]`', async () => {
      const response = await fetch(`${baseUrl}/api/demo/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rut: '' }),
      });
      const body = await bodyOf(response);

      expect(response.status).toBe(400);
      expect(Object.keys(body)).toEqual(['rut']);
      expect(Array.isArray(body.rut)).toBe(true);
      expect(typeof body.rut?.[0]).toBe('string');
    });

    it('ruta inexistente → 404 con `{detail}`', async () => {
      const response = await get('/api/no-existe/');

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ detail: 'No encontrado.' });
    });

    it('excepción no controlada → 500 sin filtrar el mensaje interno', async () => {
      const response = await get('/api/demo/boom/');

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        detail: 'Error interno del servidor.',
      });
    });
  });
});
