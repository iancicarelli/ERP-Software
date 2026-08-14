import { Global, INestApplication, Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Prisma } from '@prisma/client';

import { configureDrfLayer } from '../common/drf-layer';
import { PrismaService } from '../prisma/prisma.service';
import { ServiciosModule } from './servicios.module';

/**
 * ============================================================================
 * Test de integración de `/api/servicios/` sobre HTTP — Fase 6
 * ----------------------------------------------------------------------------
 * Mismo enfoque que clientes y direcciones: Nest real levantado en un puerto
 * efímero, Prisma de mentira que registra con qué lo llamaron.
 *
 * Lo que más importa acá son las dos reglas que tocan plata:
 *   · de dónde sale el `monto` según `personalizado`, y
 *   · que `clientes.monto_total` quede recalculado en cada mutación.
 * ============================================================================
 */

const CLIENTE = {
  id: 42,
  rut: '16.204.579-2',
  nombre1: 'Juan',
  nombre2: 'Pedro',
  apellido1: 'Huentelicán',
  apellido2: 'Soto',
};

const FILA = {
  id: 7,
  cliente_id: 42,
  direccion_id: 3,
  elemento_id: 5,
  activo: true,
  cantidad: 2,
  monto: 19990,
  personalizado: false,
  created_at: new Date(),
  updated_at: new Date(),
  cliente: CLIENTE,
  direccion: { id: 3, direccion: 'Los Carrera 123' },
  elemento: { id: 5, elemento: 'INTERNET 100 MB', monto_base: 0, activo: true },
};

/** Servicio sin dirección — `direccion_id` es la única FK nullable del modelo. */
const FILA_SIN_DIRECCION = { ...FILA, id: 8, direccion_id: null, direccion: null };

interface Registro {
  findMany?: { where?: unknown; orderBy?: unknown; skip?: number; take?: number };
  count?: { where?: unknown };
  create?: { data?: Record<string, unknown> };
  update?: { where?: unknown; data?: Record<string, unknown> };
  borrado?: { where?: unknown };
  agregado?: { where?: Record<string, unknown> };
  clienteActualizado?: { where?: unknown; data?: Record<string, unknown> };
}

const registro: Registro = {};

/** `monto_base` del elemento que devuelve el findUnique; lo cambian los tests. */
let montoBaseElemento = 0;
/** Suma que devuelve el aggregate de servicios activos. */
let sumaServiciosActivos: number | null = 45000;
/** Fila que devuelve `servicio.findUnique`; `null` fuerza el 404. */
let filaExistente: typeof FILA | null = FILA;

const prismaFalso = {
  servicio: {
    count: (args: { where: unknown }) => {
      registro.count = args;
      return Promise.resolve(1);
    },
    findMany: (args: Registro['findMany']) => {
      registro.findMany = args;
      return Promise.resolve([FILA]);
    },
    findUnique: ({ where }: { where: { id: number } }) => {
      if (where.id === FILA_SIN_DIRECCION.id) return Promise.resolve(FILA_SIN_DIRECCION);
      return Promise.resolve(where.id === FILA.id ? filaExistente : null);
    },
    create: (args: { data: Record<string, unknown> }) => {
      registro.create = args;

      // 99999 = "esta FK no existe". El `meta` es el que devuelve Prisma 6 de
      // verdad, capturado provocando el error contra la base.
      const inexistente = Object.entries({
        elemento_id: 'servicios_elemento_id_fkey',
        cliente_id: 'servicios_cliente_id_fkey',
        direccion_id: 'servicios_direccion_id_fkey',
      }).find(([columna]) => args.data[columna] === 99999);

      if (inexistente) {
        return Promise.reject(
          new Prisma.PrismaClientKnownRequestError('FK constraint failed', {
            code: 'P2003',
            clientVersion: '6.0.0',
            meta: { modelName: 'Servicio', constraint: inexistente[1] },
          }),
        );
      }

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
    aggregate: (args: { where: Record<string, unknown> }) => {
      registro.agregado = args;
      return Promise.resolve({ _sum: { monto: sumaServiciosActivos } });
    },
  },
  cliente: {
    update: (args: { where: unknown; data: Record<string, unknown> }) => {
      registro.clienteActualizado = args;
      return Promise.resolve(CLIENTE);
    },
  },
  elemento: {
    findUnique: () => Promise.resolve({ monto_base: montoBaseElemento }),
  },
  $transaction: (arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => Promise<unknown>)(prismaFalso),
} as unknown as PrismaService;

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: prismaFalso }],
  exports: [PrismaService],
})
class PrismaFalsoModule {}

@Module({ imports: [PrismaFalsoModule, ServiciosModule] })
class AppDeTestModule {}

describe('Servicios sobre HTTP', () => {
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
    montoBaseElemento = 0;
    sumaServiciosActivos = 45000;
    filaExistente = FILA;
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

  /** Las siete claves que mandan `add_entity()` y `save_entity()`. */
  const CUERPO_VALIDO = {
    activo: true,
    cantidad: 2,
    monto: 19990,
    personalizado: false,
    elemento: 5,
    direccion: 3,
    cliente: 42,
  };

  // ── Serialización ─────────────────────────────────────────────────────────

  describe('GET /api/servicios/', () => {
    it('devuelve las claves de ServiceDetailDTO, con las FK como id plano', async () => {
      const { status, body } = await pedir('/servicios/');
      const item = (body.results as Record<string, unknown>[])[0];

      expect(status).toBe(200);
      expect(item).toEqual({
        id: 7,
        activo: true,
        cantidad: 2,
        monto: 19990,
        personalizado: false,
        // `cliente`, no `cliente_id`.
        cliente: 42,
        cliente_rut: '16.204.579-2',
        cliente_str: 'Juan Pedro Huentelicán Soto',
        direccion: 3,
        direccion_str: 'Los Carrera 123',
        elemento: 5,
        elemento_elemento: 'INTERNET 100 MB',
      });
    });

    it('devuelve la envoltura DRF con count/next/previous/results', async () => {
      const { body } = await pedir('/servicios/');

      expect(Object.keys(body).sort()).toEqual([
        'count',
        'next',
        'previous',
        'results',
      ]);
      expect(body.count).toBe(1);
    });

    it('ordena por id descendente — sin orderBy la paginación no sería estable', async () => {
      await pedir('/servicios/');

      expect(registro.findMany?.orderBy).toEqual({ id: 'desc' });
    });

    /**
     * `ServiceDetailDTO` no tiene validators que conviertan null a "", a
     * diferencia de `DirectionDetailDTO`. Un null acá rompe Pydantic y el
     * detalle no carga.
     */
    it('un servicio sin dirección sale con 0 y "", nunca con null', async () => {
      const { body } = await pedir('/servicios/8/');

      expect(body.direccion).toBe(0);
      expect(body.direccion_str).toBe('');
    });
  });

  // ── Filtros ───────────────────────────────────────────────────────────────

  describe('filtros', () => {
    it('`?cliente_id=` acota la tabla del detalle de cliente', async () => {
      await pedir('/servicios/?cliente_id=42');

      expect(registro.findMany?.where).toEqual({ AND: [{ cliente_id: 42 }] });
    });

    it('`?activo=` normaliza el booleano que manda el frontend', async () => {
      await pedir('/servicios/?activo=false');

      expect(registro.findMany?.where).toEqual({ AND: [{ activo: false }] });
    });

    it('`?elemento_elemento=` compara por nombre, no por id', async () => {
      await pedir('/servicios/?elemento_elemento=INTERNET%20100%20MB');

      expect(registro.findMany?.where).toEqual({
        AND: [{ elemento: { elemento: 'INTERNET 100 MB' } }],
      });
    });

    it('los cuatro filtros del cliente hacen icontains atravesando la relación', async () => {
      await pedir('/servicios/?cliente_rut=16.204&cliente_apellido1=huen');

      expect(registro.findMany?.where).toEqual({
        AND: [
          { cliente: { rut: { contains: '16.204', mode: 'insensitive' } } },
          { cliente: { apellido1: { contains: 'huen', mode: 'insensitive' } } },
        ],
      });
    });

    it('el count usa el MISMO where que el listado', async () => {
      await pedir('/servicios/?cliente_id=42&activo=true');

      expect(registro.count?.where).toEqual(registro.findMany?.where);
    });

    it('ignora params que no están en el mapa', async () => {
      await pedir('/servicios/?inventado=1');

      expect(registro.findMany?.where).toEqual({});
    });
  });

  // ── `personalizado`: de dónde sale el monto ───────────────────────────────

  describe('POST /api/servicios/ — resolución del monto', () => {
    it('crea con 201', async () => {
      const { status } = await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(status).toBe(201);
    });

    it('con `personalizado: true` respeta el monto manual', async () => {
      montoBaseElemento = 8000;

      await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, personalizado: true, monto: 19990 }),
      });

      expect(registro.create?.data?.monto).toBe(19990);
    });

    it('con `personalizado: false` deriva monto_base × cantidad', async () => {
      montoBaseElemento = 8000;

      await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, personalizado: false, cantidad: 3 }),
      });

      expect(registro.create?.data?.monto).toBe(24000);
    });

    /**
     * Hoy los 24 elementos del catálogo tienen `monto_base = 0`. Derivar al pie
     * de la letra pondría todos los montos en 0 y pisaría lo que el usuario
     * escribió. Ver `resolverMonto()`.
     */
    it('con `monto_base = 0` respeta el monto del payload en vez de calcular 0', async () => {
      montoBaseElemento = 0;

      await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, personalizado: false, monto: 19990 }),
      });

      expect(registro.create?.data?.monto).toBe(19990);
    });

    it('traduce las FK planas a *_id', async () => {
      await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(registro.create?.data).toMatchObject({
        cliente_id: 42,
        elemento_id: 5,
        direccion_id: 3,
      });
    });

    it('`direccion: 0` es "sin dirección", no el id 0', async () => {
      await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, direccion: 0 }),
      });

      expect(registro.create?.data?.direccion_id).toBeNull();
    });
  });

  // ── monto_total del cliente ───────────────────────────────────────────────

  describe('consistencia de clientes.monto_total', () => {
    it('lo recalcula al crear, sumando solo los servicios ACTIVOS', async () => {
      await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(registro.agregado?.where).toEqual({ cliente_id: 42, activo: true });
      expect(registro.clienteActualizado).toEqual({
        where: { id: 42 },
        data: { monto_total: 45000 },
      });
    });

    it('lo recalcula al actualizar', async () => {
      await pedir('/servicios/7/', {
        method: 'PUT',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(registro.clienteActualizado?.data).toEqual({ monto_total: 45000 });
    });

    it('lo recalcula al borrar', async () => {
      await pedir('/servicios/7/', { method: 'DELETE' });

      expect(registro.borrado).toEqual({ where: { id: 7 } });
      expect(registro.clienteActualizado?.data).toEqual({ monto_total: 45000 });
    });

    it('un cliente sin servicios activos queda en 0, no en null', async () => {
      sumaServiciosActivos = null;

      await pedir('/servicios/7/', { method: 'DELETE' });

      expect(registro.clienteActualizado?.data).toEqual({ monto_total: 0 });
    });
  });

  // ── PUT / DELETE ──────────────────────────────────────────────────────────

  describe('PUT /api/servicios/{id}/', () => {
    it('devuelve 200 y el objeto completo — el frontend lo reasigna al DTO', async () => {
      const { status, body } = await pedir('/servicios/7/', {
        method: 'PUT',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(status).toBe(200);
      expect(body.id).toBe(7);
      expect(body.cliente_str).toBe('Juan Pedro Huentelicán Soto');
    });

    it('404 con forma DRF si el servicio no existe', async () => {
      filaExistente = null;

      const { status, body } = await pedir('/servicios/7/', {
        method: 'PUT',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(status).toBe(404);
      expect(body).toEqual({ detail: 'No encontrado.' });
    });
  });

  describe('DELETE /api/servicios/{id}/', () => {
    it('devuelve 204 sin cuerpo', async () => {
      const { status, body } = await pedir('/servicios/7/', { method: 'DELETE' });

      expect(status).toBe(204);
      expect(body).toEqual({});
    });

    it('404 si no existe, sin llegar a borrar', async () => {
      filaExistente = null;

      const { status } = await pedir('/servicios/7/', { method: 'DELETE' });

      expect(status).toBe(404);
      expect(registro.borrado).toBeUndefined();
    });
  });

  // ── Validación ────────────────────────────────────────────────────────────

  describe('validación con forma DRF', () => {
    it('rechaza `cantidad: 0` — hay un CHECK en la base', async () => {
      const { status, body } = await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, cantidad: 0 }),
      });

      expect(status).toBe(400);
      expect(body).toEqual({ cantidad: ['La cantidad debe ser mayor a cero.'] });
    });

    it('rechaza un monto negativo', async () => {
      const { status, body } = await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, personalizado: true, monto: -1 }),
      });

      expect(status).toBe(400);
      expect(body).toEqual({ monto: ['El monto no puede ser negativo.'] });
    });

    it('rechaza `cliente: 0` — es un cliente sin resolver, no un id', async () => {
      const { status, body } = await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, cliente: 0 }),
      });

      expect(status).toBe(400);
      expect(body).toEqual({ cliente: ['Debe seleccionar un cliente.'] });
    });

    /**
     * El `meta` de abajo es el que devolvió Prisma 6 de verdad. Con la lectura
     * anterior (`meta.field_name`) esto respondía "El cliente indicado no
     * existe." aunque el que faltara fuera el elemento.
     */
    it('nombra la FK correcta cuando el elemento no existe', async () => {
      const { status, body } = await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, elemento: 99999 }),
      });

      expect(status).toBe(400);
      expect(body).toEqual({ elemento: ['El elemento indicado no existe.'] });
    });

    it('nombra la FK correcta cuando el cliente no existe', async () => {
      const { status, body } = await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, cliente: 99999 }),
      });

      expect(status).toBe(400);
      expect(body).toEqual({ cliente: ['El cliente indicado no existe.'] });
    });

    /**
     * `whitelist: true` sin `forbidNonWhitelisted`: las etiquetas derivadas se
     * descartan en silencio en vez de romper el guardado.
     */
    it('descarta las etiquetas de solo lectura sin fallar', async () => {
      const { status } = await pedir('/servicios/', {
        method: 'POST',
        body: JSON.stringify({
          ...CUERPO_VALIDO,
          cliente_str: 'Juan Pedro Huentelicán Soto',
          elemento_elemento: 'INTERNET 100 MB',
          direccion_str: 'Los Carrera 123',
        }),
      });

      expect(status).toBe(201);
      expect(registro.create?.data).not.toHaveProperty('cliente_str');
      expect(registro.create?.data).not.toHaveProperty('elemento_elemento');
    });
  });
});
