import { Global, INestApplication, Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { configureDrfLayer } from '../common/drf-layer';
import { PrismaService } from '../prisma/prisma.service';
import { ClientesModule } from './clientes.module';

/**
 * ============================================================================
 * Test de integración de `/api/clientes/` sobre HTTP — Fase 5
 * ----------------------------------------------------------------------------
 * Monta el `ClientesModule` real sobre la misma `configureDrfLayer()` de
 * `main.ts`, con un `PrismaService` de mentira que además REGISTRA con qué
 * argumentos lo llamaron. Eso permite verificar dos cosas distintas:
 *
 *   1. lo que sale por la red (status, envoltura, shape de los errores), y
 *   2. lo que le llega a Prisma (el `where` que armaron los filtros, el `data`
 *      con "" → null y `causa_de_baja` → `causa_de_baja_id`).
 *
 * Lo que NO cubre —porque necesita Postgres de verdad— es el índice único
 * parcial, las cascadas de borrado y el SQL del `countrange`. Eso son los
 * tests e2e de la Fase 11; mientras tanto está verificado a mano contra el
 * contenedor.
 * ============================================================================
 */

const FILA = {
  id: 42,
  rut: '16.204.579-2',
  rut_validado: true,
  nombre1: 'Juan',
  nombre2: null,
  nombre3: null,
  apellido1: 'Huentelicán',
  apellido2: 'Soto',
  email: null,
  tel: null,
  co_titular1: null,
  co_titular2: null,
  activo: true,
  por_instalar: false,
  moroso: false,
  moroso_desde: null,
  deuda: 0,
  monto_total: 19990,
  krill: false,
  defontana: false,
  zammad: false,
  cpes_todos: 1,
  cpes_inactivos: 0,
  fecha_creacion: new Date('2026-03-15T00:00:00.000Z'),
  fecha_de_baja: null,
  causa_de_baja_id: null,
  donacion: false,
  analogo: false,
  corte_poste: false,
  baja_por_renuncia: false,
  baja_por_morosidad: false,
  created_at: new Date(),
  updated_at: new Date(),
  causa_de_baja: null,
  direcciones: [
    {
      id: 7,
      principal: true,
      sector: { id: 3, sector: 'Gamboa', zona_id: 1, zona: { id: 1, zona: 'Castro' } },
    },
  ],
};

interface Registro {
  count?: { where?: unknown };
  findMany?: { where?: unknown; select?: unknown; orderBy?: unknown; skip?: number; take?: number };
  create?: { data?: Record<string, unknown> };
  update?: { where?: unknown; data?: Record<string, unknown> };
  borrado?: { where?: unknown };
  sqlCrudo?: [string, unknown[]];
}

const registro: Registro = {};

const prismaFalso = {
  cliente: {
    count: (args: { where?: unknown }) => {
      registro.count = args;
      return Promise.resolve(1);
    },
    findMany: (args: Registro['findMany']) => {
      registro.findMany = args;
      return Promise.resolve(args?.select ? [{ id: 42 }, { id: 7 }] : [FILA]);
    },
    findUnique: ({ where }: { where: { id: number } }) =>
      Promise.resolve(where.id === FILA.id ? FILA : null),
    create: (args: { data: Record<string, unknown> }) => {
      registro.create = args;
      return Promise.resolve(FILA);
    },
    update: (args: { where: unknown; data: Record<string, unknown> }) => {
      registro.update = args;
      return Promise.resolve(FILA);
    },
    delete: (args: { where: unknown }) => {
      registro.borrado = args;
      return Promise.resolve(FILA);
    },
  },
  $transaction: (arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => Promise<unknown>)(prismaFalso),
  $queryRawUnsafe: (sql: string, ...params: unknown[]) => {
    registro.sqlCrudo = [sql, params];
    return Promise.resolve([{ target_id: 42 }]);
  },
} as unknown as PrismaService;

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: prismaFalso }],
  exports: [PrismaService],
})
class PrismaFalsoModule {}

@Module({ imports: [PrismaFalsoModule, ClientesModule] })
class AppDeTestModule {}

describe('Clientes sobre HTTP', () => {
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

  beforeEach(() => {
    for (const clave of Object.keys(registro)) {
      delete registro[clave as keyof Registro];
    }
  });

  const pedir = async (
    path: string,
    init?: RequestInit,
  ): Promise<{ status: number; body: Record<string, unknown> }> => {
    const response = await fetch(`${baseUrl}/api${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    const texto = await response.text();
    return {
      status: response.status,
      body: texto ? (JSON.parse(texto) as Record<string, unknown>) : {},
    };
  };

  const CUERPO_VALIDO = {
    rut: '16.204.579-2',
    nombre1: 'Juan',
    apellido1: 'Huentelicán',
    apellido2: 'Soto',
  };

  // ── GET /api/clientes/ ────────────────────────────────────────────────────

  describe('GET /api/clientes/', () => {
    it('responde la envoltura DRF con el cliente serializado', async () => {
      const { status, body } = await pedir('/clientes/?page=1&page_size=10');

      expect(status).toBe(200);
      expect(Object.keys(body).sort()).toEqual(['count', 'next', 'previous', 'results']);
      expect((body.results as unknown[])[0]).toMatchObject({
        id: 42,
        rut: '16.204.579-2',
        sector: 'Gamboa',
        zona: 'Castro',
        fecha_creacion: '2026-03-15',
      });
    });

    it('ordena por id descendente (la paginación necesita orden estable)', async () => {
      await pedir('/clientes/');

      expect(registro.findMany?.orderBy).toEqual({ id: 'desc' });
    });

    it('traduce los filtros del frontend al where de Prisma', async () => {
      await pedir('/clientes/?activo=true&zona=Castro&monto_total_min=10000');

      expect(registro.findMany?.where).toEqual({
        AND: [
          {
            direcciones: {
              some: { principal: true, sector: { zona: { zona: 'Castro' } } },
            },
          },
          { activo: true },
          { monto_total: { gte: 10000 } },
        ],
      });
    });

    it('el `count` usa el MISMO where que el `findMany`', async () => {
      await pedir('/clientes/?activo=true');

      expect(registro.count?.where).toEqual(registro.findMany?.where);
    });

    it('`cantidad_direcciones_min` dispara el SQL de conteo y cruza por id', async () => {
      await pedir('/clientes/?cantidad_direcciones_min=2');

      const [sql, params] = registro.sqlCrudo ?? ['', []];
      expect(sql).toContain('GROUP BY');
      expect(sql).toContain('HAVING COUNT(*) >= $1');
      expect(params).toEqual([2]);
      expect(registro.findMany?.where).toEqual({ AND: [{ id: { in: [42] } }] });
    });

    it('acepta `limit=1` para pedir solo el count', async () => {
      const { body } = await pedir('/clientes/?limit=1');

      expect(body.count).toBe(1);
      expect(registro.findMany?.take).toBe(1);
    });
  });

  // ── GET /api/clientes/all-ids/ ────────────────────────────────────────────

  describe('GET /api/clientes/all-ids/', () => {
    it('devuelve `{ids: [...]}` sin paginar', async () => {
      const { status, body } = await pedir('/clientes/all-ids/');

      expect(status).toBe(200);
      expect(body).toEqual({ ids: [42, 7] });
      // Sin skip/take: son TODOS los que matchean, no una página.
      expect(registro.findMany?.skip).toBeUndefined();
      expect(registro.findMany?.take).toBeUndefined();
      expect(registro.findMany?.select).toEqual({ id: true });
    });

    it('aplica los mismos filtros que el listado', async () => {
      await pedir('/clientes/all-ids/?activo=true&zona=Castro');
      const whereDeAllIds = registro.findMany?.where;

      await pedir('/clientes/?activo=true&zona=Castro');

      // Si divergieran, "seleccionar todo" marcaría clientes que no se ven.
      expect(whereDeAllIds).toEqual(registro.findMany?.where);
    });

    it('no la captura la ruta `:id`', async () => {
      // `all-ids` va declarada antes que `:id`; si no, ParseIntPipe daría 400.
      const { status } = await pedir('/clientes/all-ids/');

      expect(status).toBe(200);
    });
  });

  // ── GET /api/clientes/{id}/ ───────────────────────────────────────────────

  describe('GET /api/clientes/{id}/', () => {
    it('devuelve el detalle sin envolver en la paginación', async () => {
      const { status, body } = await pedir('/clientes/42/');

      expect(status).toBe(200);
      expect(body).not.toHaveProperty('results');
      expect(body.id).toBe(42);
    });

    it('id inexistente → 404 con `{detail}`', async () => {
      const { status, body } = await pedir('/clientes/999/');

      expect(status).toBe(404);
      expect(body).toEqual({ detail: 'No encontrado.' });
    });

    it('id no numérico → 400, no 500', async () => {
      expect((await pedir('/clientes/abc/')).status).toBe(400);
    });
  });

  // ── POST /api/clientes/ ───────────────────────────────────────────────────

  describe('POST /api/clientes/', () => {
    it('crea y responde **201** con el objeto completo', async () => {
      const { status, body } = await pedir('/clientes/', {
        method: 'POST',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(status).toBe(201);
      expect(body.id).toBe(42);
    });

    it('convierte "" en null en los opcionales', async () => {
      await pedir('/clientes/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, nombre2: '', email: '', tel: '  ' }),
      });

      // El frontend manda "" en todo lo que el usuario no completó.
      expect(registro.create?.data).toMatchObject({
        nombre2: null,
        email: null,
        tel: null,
      });
    });

    it('mapea `causa_de_baja` (id plano) a `causa_de_baja_id`', async () => {
      await pedir('/clientes/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, causa_de_baja: 3 }),
      });

      expect(registro.create?.data).toMatchObject({ causa_de_baja_id: 3 });
      expect(registro.create?.data).not.toHaveProperty('causa_de_baja');
    });

    it('convierte las fechas AAAA-MM-DD a Date y el null a null', async () => {
      await pedir('/clientes/', {
        method: 'POST',
        body: JSON.stringify({
          ...CUERPO_VALIDO,
          moroso_desde: '2026-01-31',
          fecha_de_baja: null,
        }),
      });

      expect(registro.create?.data).toMatchObject({
        moroso_desde: new Date('2026-01-31T00:00:00.000Z'),
        fecha_de_baja: null,
      });
    });

    it('**descarta `sector` y `zona`**: por D4 son derivados de solo lectura', async () => {
      await pedir('/clientes/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, sector: 'Gamboa', zona: 'Castro' }),
      });

      // El frontend los reenvía tal como los recibió. Guardarlos sería
      // imposible (no hay columnas) y rechazar la request rompería el guardado.
      expect(registro.create?.data).not.toHaveProperty('sector');
      expect(registro.create?.data).not.toHaveProperty('zona');
    });

    it('sin RUT → 400 con `{campo: [mensajes]}`', async () => {
      const { status, body } = await pedir('/clientes/', {
        method: 'POST',
        body: JSON.stringify({ nombre1: 'Juan', apellido1: 'Soto' }),
      });

      expect(status).toBe(400);
      expect(Object.keys(body)).toEqual(['rut']);
      expect(Array.isArray(body.rut)).toBe(true);
    });

    it('un monto con decimales → 400 (D5: CLP no tiene centavos)', async () => {
      const { status, body } = await pedir('/clientes/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, monto_total: 1500.5 }),
      });

      expect(status).toBe(400);
      expect(Object.keys(body)).toEqual(['monto_total']);
    });

    it('un monto entero escrito como float (0.0) se acepta', async () => {
      // El DTO del frontend declara `deuda: float` y manda 0.0.
      const { status } = await pedir('/clientes/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, deuda: 0.0, monto_total: 19990.0 }),
      });

      expect(status).toBe(201);
    });
  });

  // ── PUT /api/clientes/{id}/ ───────────────────────────────────────────────

  describe('PUT /api/clientes/{id}/', () => {
    it('responde 200 con el objeto completo actualizado', async () => {
      const { status, body } = await pedir('/clientes/42/', {
        method: 'PUT',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      // El frontend hace `self.cliente = ClientDetailDTO(**data)`: si la
      // respuesta viniera vacía, la ficha se rompería después de guardar.
      expect(status).toBe(200);
      expect(body).toMatchObject({ id: 42, rut: '16.204.579-2', sector: 'Gamboa' });
    });

    it('id inexistente → 404 (no el P2025 crudo de Prisma)', async () => {
      const { status, body } = await pedir('/clientes/999/', {
        method: 'PUT',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(status).toBe(404);
      expect(body).toEqual({ detail: 'No encontrado.' });
    });
  });

  // ── DELETE /api/clientes/{id}/ ────────────────────────────────────────────

  describe('DELETE /api/clientes/{id}/', () => {
    it('responde **204** sin cuerpo', async () => {
      const { status, body } = await pedir('/clientes/42/', { method: 'DELETE' });

      expect(status).toBe(204);
      expect(body).toEqual({});
      expect(registro.borrado?.where).toEqual({ id: 42 });
    });

    it('id inexistente → 404', async () => {
      expect((await pedir('/clientes/999/', { method: 'DELETE' })).status).toBe(404);
    });
  });
});
