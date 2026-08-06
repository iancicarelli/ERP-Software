import { Global, INestApplication, Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { configureDrfLayer } from '../common/drf-layer';
import { PrismaService } from '../prisma/prisma.service';
import { CATALOGOS } from './catalogos.definiciones';
import { CatalogosModule } from './catalogos.module';

/**
 * ============================================================================
 * Test de integración de los 9 catálogos sobre HTTP — Fase 4a
 * ----------------------------------------------------------------------------
 * Monta el `CatalogosModule` real sobre la misma `configureDrfLayer()` de
 * `main.ts`, con un `PrismaService` de mentira que devuelve filas fijas.
 *
 * Lo que se verifica es lo que el frontend necesita:
 *   - las 9 rutas existen, con y sin barra final,
 *   - responden `{count, next, previous, results}`,
 *   - `next` es `null` en la última página — si no, los dropdowns pagina
 *     para siempre (`while has_more`),
 *   - `page_size=500` funciona (es lo que piden todos los `_load_paginated`),
 *   - cada ítem trae EXACTAMENTE las claves que el frontend lee.
 *
 * El guard de la Fase 3 no se monta acá: lo suyo ya lo prueba
 * `auth.integration.spec.ts`, y mezclarlo obligaría a firmar tokens en cada
 * request para probar otra cosa.
 * ============================================================================
 */

/** Filas de mentira, una por tabla. Alcanzan para probar los serializers. */
const FILAS: Record<string, unknown[]> = {
  zona: [
    { id: 1, zona: 'Castro' },
    { id: 2, zona: 'Ancud' },
  ],
  sector: [
    { id: 10, sector: 'Gamboa', zona_id: 1, zona: { id: 1, zona: 'Castro' } },
    { id: 11, sector: 'Pudeto', zona_id: 2, zona: { id: 2, zona: 'Ancud' } },
  ],
  elemento: [{ id: 1, elemento: 'PLAN DUO CLASICO', monto_base: 19990, activo: true }],
  causaBaja: [{ id: 1, causa: 'Por morosidad' }],
  servicioOrden: [{ id: 1, servicio: 'Plan Duo Clasico' }],
  estadoOrden: [{ id: 1, estado: 'Instalado' }],
  causaOrden: [{ id: 1, causa: 'Falta de poste' }],
  tecnico: [
    { id: 1, nombre1: 'Cristian', apellido1: 'Quiroz', apellido2: null, activo: true },
  ],
  vendedor: [
    { id: 1, nombre1: 'Paulina', apellido1: 'Pino', apellido2: null, activo: true },
  ],
};

/** Claves exactas que el frontend lee de cada ruta. Ni una más, ni una menos. */
const CLAVES_ESPERADAS: Record<string, string[]> = {
  zonas: ['id', 'zona'],
  sectores: ['id', 'sector', 'zona', 'zona_str'],
  elementos: ['id', 'elemento', 'monto_base', 'activo'],
  causadebajas: ['id', 'causa'],
  'servicios-ordenes': ['id', 'servicio'],
  'estados-ordenes': ['id', 'estado'],
  'causas-ordenes': ['id', 'causa'],
  'tecnicos-ordenes': ['id', 'nombre1', 'apellido1', 'apellido2', 'activo'],
  'vendedores-ordenes': ['id', 'nombre1', 'apellido1', 'apellido2', 'activo'],
};

/**
 * `PrismaService` de mentira: cada delegate responde `count` y `findMany`
 * respetando `skip`/`take`, y `$transaction` ejecuta las promesas del array.
 * Con eso alcanza para probar la paginación de verdad.
 */
function crearPrismaFalso() {
  const delegate = (tabla: string) => ({
    count: () => Promise.resolve(FILAS[tabla].length),
    findMany: ({ skip = 0, take = 50 }: { skip?: number; take?: number } = {}) =>
      Promise.resolve(FILAS[tabla].slice(skip, skip + take)),
  });

  return {
    ...Object.fromEntries(Object.keys(FILAS).map((tabla) => [tabla, delegate(tabla)])),
    $transaction: (promesas: Promise<unknown>[]) => Promise.all(promesas),
  } as unknown as PrismaService;
}

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: crearPrismaFalso() }],
  exports: [PrismaService],
})
class PrismaFalsoModule {}

@Module({ imports: [PrismaFalsoModule, CatalogosModule] })
class AppDeTestModule {}

describe('Catálogos sobre HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    app = await NestFactory.create(AppDeTestModule, { logger: false });
    app.setGlobalPrefix('api');
    configureDrfLayer(app);

    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });

  interface Pagina {
    count: number;
    next: string | null;
    previous: string | null;
    results: Array<Record<string, unknown>>;
  }

  const get = async (path: string): Promise<{ status: number; body: Pagina }> => {
    const response = await fetch(`${baseUrl}/api${path}`);
    return { status: response.status, body: (await response.json()) as Pagina };
  };

  const rutas = CATALOGOS.map((c) => c.ruta);

  it('están las 9 rutas del ROADMAP §3.7, sin las de zona/sector duplicadas', () => {
    expect(rutas).toEqual([
      'zonas',
      'sectores',
      'elementos',
      'causadebajas',
      'servicios-ordenes',
      'estados-ordenes',
      'causas-ordenes',
      'tecnicos-ordenes',
      'vendedores-ordenes',
    ]);
  });

  describe.each(rutas)('/api/%s/', (ruta) => {
    it('responde 200 con la envoltura DRF completa', async () => {
      const { status, body } = await get(`/${ruta}/`);

      expect(status).toBe(200);
      expect(Object.keys(body).sort()).toEqual(['count', 'next', 'previous', 'results']);
      expect(body.count).toBeGreaterThan(0);
      expect(body.results).toHaveLength(body.count);
    });

    it('`next` y `previous` son null cuando entra todo en una página', async () => {
      // De esto depende que `while has_more` de los dropdowns termine.
      const { body } = await get(`/${ruta}/?page_size=500`);

      expect(body.next).toBeNull();
      expect(body.previous).toBeNull();
    });

    it('cada ítem trae exactamente las claves que lee el frontend', async () => {
      const { body } = await get(`/${ruta}/`);

      for (const item of body.results) {
        expect(Object.keys(item).sort()).toEqual([...CLAVES_ESPERADAS[ruta]].sort());
      }
    });

    it('responde igual sin la barra final', async () => {
      const { status } = await get(`/${ruta}`);

      expect(status).toBe(200);
    });

    it('acepta `limit=1` (lo que usa el dashboard para pedir solo el count)', async () => {
      const completo = await get(`/${ruta}/`);
      const { body } = await get(`/${ruta}/?limit=1`);

      // El `count` es el total, no el tamaño de la página: es todo el punto.
      expect(body.results).toHaveLength(1);
      expect(body.count).toBe(completo.body.count);
    });
  });

  describe('/api/sectores/ — el caso con relación', () => {
    it('resuelve `zona_str` y devuelve `zona` como ID', async () => {
      const { body } = await get('/sectores/?page_size=500');

      expect(body.results).toEqual([
        { id: 10, sector: 'Gamboa', zona: 1, zona_str: 'Castro' },
        { id: 11, sector: 'Pudeto', zona: 2, zona_str: 'Ancud' },
      ]);
    });

    it('`zona` es el ID numérico: `filter_sectores_by_zona_id` compara contra eso', async () => {
      const { body } = await get('/sectores/');

      for (const sector of body.results) {
        expect(typeof sector.zona).toBe('number');
      }
    });
  });

  describe('paginación real', () => {
    it('la primera página de dos apunta a la siguiente', async () => {
      const { body } = await get('/zonas/?page=1&page_size=1');

      expect(body.count).toBe(2);
      expect(body.results).toEqual([{ id: 1, zona: 'Castro' }]);
      expect(body.next).toContain('page=2');
      expect(body.previous).toBeNull();
    });

    it('la última página cierra el bucle con `next: null`', async () => {
      const { body } = await get('/zonas/?page=2&page_size=1');

      expect(body.results).toEqual([{ id: 2, zona: 'Ancud' }]);
      expect(body.next).toBeNull();
      expect(body.previous).not.toBeNull();
    });
  });
});
