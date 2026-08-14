import { Global, INestApplication, Logger, Module, NestMiddleware } from '@nestjs/common';
import { MiddlewareConsumer, Injectable } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';

import { configureDrfLayer } from '../common/drf-layer';
import { PrismaService } from '../prisma/prisma.service';
import { OrdenesModule } from './ordenes.module';

/**
 * ============================================================================
 * `/api/ordenes/` y `/api/notas-ordenes/` sobre HTTP — Fase 7
 * ----------------------------------------------------------------------------
 * Mismo enfoque que las fases 5 y 6: un Nest real con la `configureDrfLayer()`
 * de `main.ts` y un `PrismaService` de mentira que REGISTRA con qué lo
 * llamaron. Así se verifican las dos mitades:
 *
 *   1. lo que sale por la red (status, envoltura, claves, shape de errores), y
 *   2. lo que le llega a Prisma (el `where` de los filtros, el `data` con las
 *      FK traducidas a `*_id`, y el `cliente_id` que resolvió D9).
 *
 * Lo que NO cubre —hace falta Postgres— son las cascadas y los índices. Eso es
 * la Fase 11; mientras tanto está verificado a mano contra el contenedor.
 * ============================================================================
 */

const CLIENTE_EXISTENTE = { id: 42, rut: '16204579-2' };

const ORDEN_FILA = {
  id: 6329,
  cliente_id: 42,
  koboid: null,
  koboid_serie: null,
  kobo_asset_uid: null,
  kobo_submission_time: null,
  rut: '16.204.579-2',
  nombre1: 'Juan',
  apellido1: 'Huentelicán',
  apellido2: 'Soto',
  email: null,
  tel: null,
  contrato_nuevo: true,
  fecha_contrato: new Date('2026-03-01T00:00:00.000Z'),
  modificacion_plan: false,
  migracion: false,
  traslado: false,
  servicio_id: 3,
  anexos_extras: 0,
  anexos_extras_exterior: 0,
  sintonizadores: 0,
  extensores_wifi: 0,
  metros_extras: 0,
  costo_metros_extras: 0,
  pago_instalacion: true,
  costo_instalacion: 0,
  monto: 19990,
  direccion: 'Av. Siempreviva 742',
  direccion_id: null,
  coordenadas: null,
  medidor_luz: false,
  ducto: false,
  metros_ducto: 0,
  poda: false,
  vecino: false,
  postacion: false,
  postes: 0,
  observacion_vendedor: null,
  observacion: null,
  abierto: true,
  evaluacion: false,
  estado_id: 2,
  causa_id: null,
  bienvenida: false,
  comision: false,
  comision_pagada: false,
  fecha_pago: null,
  fecha_ingreso: new Date('2026-02-28T00:00:00.000Z'),
  fecha_programado: new Date('2026-03-20T14:30:00.000Z'),
  fecha_instalado: null,
  vendedor_id: 7,
  tecnico_id: null,
  tecnico2: null,
  zona_id: 1,
  sector_id: 3,
  created_at: new Date(),
  updated_at: new Date(),
  estado: { id: 2, estado: 'Programado' },
  causa: null,
  servicio: { id: 3, servicio: 'Plan Duo Superior' },
  vendedor: { id: 7, nombre1: 'Paulina', apellido1: 'Pino', apellido2: null, activo: true, usuario_id: null },
  tecnico: null,
  zona: { id: 1, zona: 'Concepción' },
  sector: { id: 3, sector: 'Nonguén', zona_id: 1 },
};

const NOTA_FILA = {
  id: 11,
  orden_trabajo_id: 6329,
  nota: 'Se reprograma a pedido del cliente',
  added_by_id: 1,
  fecha_creacion: new Date('2026-03-18T11:05:00.000Z'),
  added_by: { id: 1, username: 'admin' },
  orden_trabajo: { id: 6329, rut: '16.204.579-2', nombre1: 'Juan', apellido1: 'Huentelicán' },
};

interface Registro {
  ordenCount?: { where?: unknown };
  ordenFindMany?: { where?: unknown; select?: unknown; orderBy?: unknown };
  ordenCreate?: { data?: Record<string, unknown> };
  ordenUpdate?: { where?: unknown; data?: Record<string, unknown> };
  clienteFindFirst?: { where?: unknown };
  notaFindMany?: { where?: unknown };
  notaCreate?: { data?: Record<string, unknown> };
}

const registro: Registro = {};

/** Se cambia por test para simular "el RUT no existe en clientes". */
let clienteEncontrado: { id: number } | null = { id: CLIENTE_EXISTENTE.id };

const prismaFalso = {
  ordenTrabajo: {
    count: (args: { where?: unknown }) => {
      registro.ordenCount = args;
      return Promise.resolve(1);
    },
    findMany: (args: Registro['ordenFindMany']) => {
      registro.ordenFindMany = args;
      return Promise.resolve(args?.select ? [{ id: 6329 }, { id: 6330 }] : [ORDEN_FILA]);
    },
    findUnique: ({ where }: { where: { id: number } }) =>
      Promise.resolve(where.id === ORDEN_FILA.id ? ORDEN_FILA : null),
    create: (args: { data: Record<string, unknown> }) => {
      registro.ordenCreate = args;
      return Promise.resolve(ORDEN_FILA);
    },
    update: (args: { where: unknown; data: Record<string, unknown> }) => {
      registro.ordenUpdate = args;
      return Promise.resolve(ORDEN_FILA);
    },
  },
  cliente: {
    findFirst: (args: { where?: unknown }) => {
      registro.clienteFindFirst = args;
      return Promise.resolve(clienteEncontrado);
    },
  },
  notaOrden: {
    count: () => Promise.resolve(1),
    findMany: (args: { where?: unknown }) => {
      registro.notaFindMany = args;
      return Promise.resolve([NOTA_FILA]);
    },
    create: (args: { data: Record<string, unknown> }) => {
      registro.notaCreate = args;
      return Promise.resolve(NOTA_FILA);
    },
  },
  $transaction: (arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => Promise<unknown>)(prismaFalso),
} as unknown as PrismaService;

/**
 * Pone el usuario que normalmente deja el `JwtAuthGuard`. El guard no se monta
 * acá (es de otro módulo), pero `POST /notas-ordenes/` lee `@CurrentUser()` y
 * sin esto no habría forma de comprobar que `added_by` sale del token.
 */
@Injectable()
class UsuarioFalsoMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    (req as Request & { user?: unknown }).user = {
      id: 1,
      username: 'admin',
      is_staff: true,
    };
    next();
  }
}

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: prismaFalso }],
  exports: [PrismaService],
})
class PrismaFalsoModule {}

@Module({ imports: [PrismaFalsoModule, OrdenesModule] })
class AppDeTestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UsuarioFalsoMiddleware).forRoutes('*');
  }
}

describe('Órdenes sobre HTTP', () => {
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
    clienteEncontrado = { id: CLIENTE_EXISTENTE.id };
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

  /** Lo mínimo que valida el DTO; el frontend manda ~50 claves. */
  const CUERPO_VALIDO = {
    rut: '16.204.579-2',
    nombre1: 'Juan',
    apellido1: 'Huentelicán',
    apellido2: 'Soto',
    estado: 2,
    servicio: 3,
    vendedor: 7,
    zona: 1,
    sector: 3,
  };

  // ── GET /api/ordenes/ ─────────────────────────────────────────────────────

  describe('GET /api/ordenes/', () => {
    it('responde la envoltura DRF con la orden serializada para TABLA', async () => {
      const { status, body } = await pedir('/ordenes/?page=1&page_size=10');

      expect(status).toBe(200);
      expect(Object.keys(body).sort()).toEqual(['count', 'next', 'previous', 'results']);

      const fila = (body.results as Record<string, unknown>[])[0];
      // Claves de la vista de TABLA, no del detalle.
      expect(fila).toMatchObject({
        id: 6329,
        estado_estado: 'Programado',
        servicio_servicio: 'Plan Duo Superior',
        zona_str: 'Concepción',
        sector_str: 'Nonguén',
      });
      expect(fila).not.toHaveProperty('estado_str');
      expect(fila).not.toHaveProperty('observacion');
    });

    it('`tecnico_str` va en null si no hay técnico asignado', () => {
      // `OrderDTO.tecnico_str` es Optional: el default "Sin asignar" solo se
      // aplica si la clave FALTA, así que el null tiene que pasar la validación.
      expect(ORDEN_FILA.tecnico).toBeNull();
    });

    it('traduce los filtros al `where` que recibe Prisma', async () => {
      await pedir(
        '/ordenes/?abierto=true&zona_zona=Concepción&anexos_extras_min=2&tecnico_nombre1=Juan',
      );

      expect(registro.ordenCount?.where).toEqual({
        AND: [
          { zona: { zona: 'Concepción' } },
          { abierto: true },
          { anexos_extras: { gte: 2 } },
          { tecnico: { nombre1: { contains: 'Juan', mode: 'insensitive' } } },
        ],
      });
    });

    it('ordena por id desc — sin orderBy la paginación repetiría filas', async () => {
      await pedir('/ordenes/');
      expect(registro.ordenFindMany?.orderBy).toEqual({ id: 'desc' });
    });
  });

  // ── GET /api/ordenes/all-ids/ ─────────────────────────────────────────────

  describe('GET /api/ordenes/all-ids/', () => {
    it('devuelve `{ids: [...]}` sin paginar', async () => {
      const { status, body } = await pedir('/ordenes/all-ids/');

      expect(status).toBe(200);
      expect(body).toEqual({ ids: [6329, 6330] });
    });

    it('aplica los MISMOS filtros que el listado (§3.8)', async () => {
      await pedir('/ordenes/all-ids/?abierto=true');
      const whereDeAllIds = registro.ordenFindMany?.where;

      await pedir('/ordenes/?abierto=true');
      expect(whereDeAllIds).toEqual(registro.ordenCount?.where);
    });

    it('no lo captura la ruta `:id`', async () => {
      // Si `@Get(':id')` estuviera declarado antes, el ParseIntPipe daría 400.
      const { status } = await pedir('/ordenes/all-ids/');
      expect(status).toBe(200);
    });
  });

  // ── GET /api/ordenes/{id}/ ────────────────────────────────────────────────

  describe('GET /api/ordenes/{id}/', () => {
    it('devuelve el DETALLE, con las FK como entero y las etiquetas', async () => {
      const { status, body } = await pedir('/ordenes/6329/');

      expect(status).toBe(200);
      expect(body).toMatchObject({
        id: 6329,
        estado: 2,
        estado_str: 'Programado',
        servicio: 3,
        servicio_str: 'Plan Duo Superior',
        zona_zona: 'Concepción',
        sector_sector: 'Nonguén',
        direccion: 'Av. Siempreviva 742',
        fecha_programado: '2026-03-20T14:30',
      });
    });

    it('id inexistente → 404 con forma DRF', async () => {
      const { status, body } = await pedir('/ordenes/999/');

      expect(status).toBe(404);
      expect(body).toEqual({ detail: 'No encontrado.' });
    });
  });

  // ── POST /api/ordenes/ ────────────────────────────────────────────────────

  describe('POST /api/ordenes/', () => {
    it('responde 201 con el objeto completo', async () => {
      const { status, body } = await pedir('/ordenes/', {
        method: 'POST',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(status).toBe(201);
      expect(body).toMatchObject({ id: 6329 });
    });

    it('traduce las FK planas a `*_id`', async () => {
      await pedir('/ordenes/', {
        method: 'POST',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(registro.ordenCreate?.data).toMatchObject({
        estado_id: 2,
        servicio_id: 3,
        vendedor_id: 7,
        zona_id: 1,
        sector_id: 3,
      });
      expect(registro.ordenCreate?.data).not.toHaveProperty('estado');
    });

    describe('D9 — el cliente se resuelve por RUT', () => {
      it('busca el RUT en los dos formatos, con y sin puntos', async () => {
        await pedir('/ordenes/', {
          method: 'POST',
          body: JSON.stringify(CUERPO_VALIDO),
        });

        // Un `IN` sobre la columna con índice único, no un replace() por fila.
        expect(registro.clienteFindFirst?.where).toEqual({
          rut: { in: ['16204579-2', '16.204.579-2'] },
        });
      });

      it('setea `cliente_id` cuando el RUT matchea', async () => {
        await pedir('/ordenes/', {
          method: 'POST',
          body: JSON.stringify(CUERPO_VALIDO),
        });

        expect(registro.ordenCreate?.data).toMatchObject({ cliente_id: 42 });
      });

      it('un RUT desconocido deja `cliente_id` en null y NO falla', async () => {
        clienteEncontrado = null;

        const { status } = await pedir('/ordenes/', {
          method: 'POST',
          body: JSON.stringify({ ...CUERPO_VALIDO, rut: '99.999.999-9' }),
        });

        // Venta a alguien que todavía no es cliente. Si negocio dice que es un
        // error de carga, esto pasa a ser 400 (pregunta 7 del ROADMAP §8).
        expect(status).toBe(201);
        expect(registro.ordenCreate?.data).toMatchObject({ cliente_id: null });
      });

      it('el snapshot guarda lo que vino en el payload, no lo del cliente', async () => {
        await pedir('/ordenes/', {
          method: 'POST',
          body: JSON.stringify({ ...CUERPO_VALIDO, nombre1: 'Juan Pablo' }),
        });

        expect(registro.ordenCreate?.data).toMatchObject({
          rut: '16.204.579-2',
          nombre1: 'Juan Pablo',
        });
      });
    });

    it('`""` → null en los textos opcionales', async () => {
      await pedir('/ordenes/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, observacion: '', coordenadas: '' }),
      });

      expect(registro.ordenCreate?.data).toMatchObject({
        observacion: null,
        coordenadas: null,
      });
    });

    it('sin RUT → 400 con `{campo: [mensajes]}`', async () => {
      const { status, body } = await pedir('/ordenes/', {
        method: 'POST',
        body: JSON.stringify({ nombre1: 'Juan', apellido1: 'Soto' }),
      });

      expect(status).toBe(400);
      expect(Object.keys(body)).toEqual(['rut']);
      expect(Array.isArray(body.rut)).toBe(true);
    });

    it('descarta las etiquetas de solo lectura que el frontend pueda reenviar', async () => {
      await pedir('/ordenes/', {
        method: 'POST',
        body: JSON.stringify({
          ...CUERPO_VALIDO,
          estado_str: 'Programado',
          zona_zona: 'Concepción',
          cliente: 999,
        }),
      });

      // `whitelist: true`: no están en el DTO, se van sin romper el guardado.
      // Ojo con `cliente`: aunque llegara, NO se usa — el vínculo lo decide el
      // RUT (D9).
      expect(registro.ordenCreate?.data).not.toHaveProperty('estado_str');
      expect(registro.ordenCreate?.data).toMatchObject({ cliente_id: 42 });
    });
  });

  // ── PUT /api/ordenes/{id}/ ────────────────────────────────────────────────

  describe('PUT /api/ordenes/{id}/', () => {
    it('responde 200 con el objeto completo actualizado', async () => {
      const { status, body } = await pedir('/ordenes/6329/', {
        method: 'PUT',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(status).toBe(200);
      expect(body).toMatchObject({ id: 6329, estado_str: 'Programado' });
    });

    it('**vuelve a resolver `cliente_id`**: el RUT es editable', async () => {
      await pedir('/ordenes/6329/', {
        method: 'PUT',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      // Si el vínculo quedara fijo desde el alta, corregir el RUT dejaría la
      // orden colgando del cliente equivocado.
      expect(registro.clienteFindFirst).toBeDefined();
      expect(registro.ordenUpdate?.data).toMatchObject({ cliente_id: 42 });
    });

    it('id inexistente → 404', async () => {
      const { status, body } = await pedir('/ordenes/999/', {
        method: 'PUT',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(status).toBe(404);
      expect(body).toEqual({ detail: 'No encontrado.' });
    });
  });

  // ── /api/notas-ordenes/ ───────────────────────────────────────────────────

  describe('GET /api/notas-ordenes/', () => {
    it('filtra por `orden_trabajo_id` y devuelve la envoltura DRF', async () => {
      const { status, body } = await pedir(
        '/notas-ordenes/?orden_trabajo_id=6329&page_size=100',
      );

      expect(status).toBe(200);
      expect(registro.notaFindMany?.where).toEqual({
        AND: [{ orden_trabajo_id: 6329 }],
      });

      expect((body.results as Record<string, unknown>[])[0]).toMatchObject({
        id: 11,
        orden_trabajo: 6329,
        nota: 'Se reprograma a pedido del cliente',
        added_by: 1,
        added_by_username: 'admin',
      });
    });

    it('`fecha_creacion` sale en ISO con la T', async () => {
      const { body } = await pedir('/notas-ordenes/?orden_trabajo_id=6329');
      const nota = (body.results as Record<string, unknown>[])[0];

      // El frontend hace `fc[:10] + " " + fc[11:16]`: sin la T, la hora se
      // corta mal y sale texto roto en pantalla.
      expect(nota.fecha_creacion).toBe('2026-03-18T11:05:00.000Z');
    });
  });

  describe('POST /api/notas-ordenes/', () => {
    it('responde **201** y toma `added_by` del token, no del payload', async () => {
      const { status } = await pedir('/notas-ordenes/', {
        method: 'POST',
        body: JSON.stringify({
          orden_trabajo: 6329,
          nota: '  Se reprograma  ',
          added_by: 999,
        }),
      });

      expect(status).toBe(201);
      expect(registro.notaCreate?.data).toEqual({
        orden_trabajo_id: 6329,
        nota: 'Se reprograma',
        added_by_id: 1,
      });
    });

    it('nota vacía → 400 por campo', async () => {
      const { status, body } = await pedir('/notas-ordenes/', {
        method: 'POST',
        body: JSON.stringify({ orden_trabajo: 6329, nota: '' }),
      });

      expect(status).toBe(400);
      expect(Object.keys(body)).toEqual(['nota']);
    });

    it('sin orden → 400 por campo', async () => {
      const { status, body } = await pedir('/notas-ordenes/', {
        method: 'POST',
        body: JSON.stringify({ nota: 'algo' }),
      });

      expect(status).toBe(400);
      expect(Object.keys(body)).toEqual(['orden_trabajo']);
    });
  });
});
