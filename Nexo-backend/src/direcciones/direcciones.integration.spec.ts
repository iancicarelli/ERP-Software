import { Global, INestApplication, Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { configureDrfLayer } from '../common/drf-layer';
import { PrismaService } from '../prisma/prisma.service';
import { DireccionesModule } from './direcciones.module';

/**
 * ============================================================================
 * Test de integración de `/api/direcciones/` sobre HTTP — Fase 5
 * ----------------------------------------------------------------------------
 * Mismo enfoque que `clientes.integration.spec.ts`: Nest real, Prisma de
 * mentira que registra con qué lo llamaron.
 *
 * Lo que más importa acá es la regla de negocio: **una sola dirección
 * principal por cliente**. La base la impone con un índice único parcial, pero
 * el índice solo sabe rechazar; lo que el usuario quiere al marcar otra como
 * principal es que la anterior deje de serlo. Eso se verifica abajo.
 * ============================================================================
 */

const FILA = {
  id: 7,
  cliente_id: 42,
  sector_id: 3,
  activo: true,
  principal: true,
  contrato: 900123,
  sucursal: null,
  direccion: 'Los Carrera 123',
  coordenadas: null,
  monto: 19990,
  created_at: new Date(),
  updated_at: new Date(),
  cliente: {
    id: 42,
    rut: '16.204.579-2',
    nombre1: 'Juan',
    nombre2: 'Pedro',
    apellido1: 'Huentelicán',
    apellido2: 'Soto',
  },
  sector: { id: 3, sector: 'Gamboa', zona_id: 1, zona: { id: 1, zona: 'Castro' } },
};

interface Registro {
  findMany?: { where?: unknown; orderBy?: unknown };
  create?: { data?: Record<string, unknown> };
  update?: { where?: unknown; data?: Record<string, unknown> };
  updateMany?: { where?: Record<string, unknown>; data?: unknown };
  borrado?: { where?: unknown };
  serviciosContados?: { where?: unknown };
}

const registro: Registro = {};
/** Cuántos servicios "tiene" la dirección; lo cambia el test de borrado. */
let serviciosAsociados = 0;

const prismaFalso = {
  direccion: {
    count: () => Promise.resolve(1),
    findMany: (args: Registro['findMany']) => {
      registro.findMany = args;
      return Promise.resolve([FILA]);
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
    updateMany: (args: { where: Record<string, unknown>; data: unknown }) => {
      registro.updateMany = args;
      return Promise.resolve({ count: 1 });
    },
    delete: (args: { where: unknown }) => {
      registro.borrado = args;
      return Promise.resolve(FILA);
    },
  },
  servicio: {
    count: (args: { where: unknown }) => {
      registro.serviciosContados = args;
      return Promise.resolve(serviciosAsociados);
    },
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

@Module({ imports: [PrismaFalsoModule, DireccionesModule] })
class AppDeTestModule {}

describe('Direcciones sobre HTTP', () => {
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
    serviciosAsociados = 0;
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
    direccion: 'Los Carrera 123',
    cliente: 42,
    sector: 3,
    activo: true,
    principal: false,
    contrato: 900123,
    sucursal: '',
    coordenadas: '',
    monto: 19990,
  };

  // ── Serialización ─────────────────────────────────────────────────────────

  describe('GET /api/direcciones/', () => {
    it('devuelve las claves de DirectionDetailDTO, con las FK como id plano', async () => {
      const { status, body } = await pedir('/direcciones/?cliente_id=42');
      const item = (body.results as Record<string, unknown>[])[0];

      expect(status).toBe(200);
      expect(item).toEqual({
        id: 7,
        activo: true,
        principal: true,
        contrato: 900123,
        sucursal: null,
        direccion: 'Los Carrera 123',
        coordenadas: null,
        monto: 19990,
        // `cliente` y `sector`, NO `cliente_id` / `sector_id`.
        cliente: 42,
        cliente_rut: '16.204.579-2',
        cliente_str: 'Juan Pedro Huentelicán Soto',
        sector: 3,
        sector_str: 'Gamboa',
        // La tabla del detalle de cliente pinta esto en la columna "Zona".
        sector_zona: 'Castro',
      });
    });

    it('filtra por `?cliente_id=`', async () => {
      await pedir('/direcciones/?cliente_id=42');

      expect(registro.findMany?.where).toEqual({ AND: [{ cliente_id: 42 }] });
    });

    it('ordena la principal primero', async () => {
      await pedir('/direcciones/?cliente_id=42');

      expect(registro.findMany?.orderBy).toEqual([{ principal: 'desc' }, { id: 'asc' }]);
    });
  });

  // ── Una sola principal por cliente ────────────────────────────────────────

  describe('máximo una dirección principal por cliente', () => {
    it('al crear una principal, baja la principal anterior del cliente', async () => {
      await pedir('/direcciones/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, principal: true }),
      });

      expect(registro.updateMany?.where).toEqual({ cliente_id: 42, principal: true });
      expect(registro.updateMany?.data).toEqual({ principal: false });
    });

    it('al editar, no se baja a sí misma', async () => {
      await pedir('/direcciones/7/', {
        method: 'PUT',
        body: JSON.stringify({ ...CUERPO_VALIDO, principal: true }),
      });

      // Sin el `id: {not: 7}`, la dirección se desmarcaría justo antes de
      // volver a marcarse: el resultado final sería el mismo, pero por accidente.
      expect(registro.updateMany?.where).toEqual({
        cliente_id: 42,
        principal: true,
        id: { not: 7 },
      });
    });

    it('si la dirección NO es principal, no toca a las demás', async () => {
      await pedir('/direcciones/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, principal: false }),
      });

      expect(registro.updateMany).toBeUndefined();
    });
  });

  // ── Escritura ─────────────────────────────────────────────────────────────

  describe('POST /api/direcciones/', () => {
    it('crea con **201** y mapea `cliente`/`sector` a las columnas FK', async () => {
      const { status } = await pedir('/direcciones/', {
        method: 'POST',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(status).toBe(201);
      expect(registro.create?.data).toMatchObject({ cliente_id: 42, sector_id: 3 });
      expect(registro.create?.data).not.toHaveProperty('cliente');
    });

    it('convierte "" en null en sucursal y coordenadas', async () => {
      await pedir('/direcciones/', {
        method: 'POST',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(registro.create?.data).toMatchObject({
        sucursal: null,
        coordenadas: null,
      });
    });

    it('sin dirección → 400 con forma DRF', async () => {
      const { status, body } = await pedir('/direcciones/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, direccion: '' }),
      });

      expect(status).toBe(400);
      expect(Object.keys(body)).toEqual(['direccion']);
    });

    it('sector en 0 → 400 (el frontend lo usa como "sin seleccionar")', async () => {
      const { status, body } = await pedir('/direcciones/', {
        method: 'POST',
        body: JSON.stringify({ ...CUERPO_VALIDO, sector: 0 }),
      });

      expect(status).toBe(400);
      expect(Object.keys(body)).toEqual(['sector']);
    });

    it('sin cliente → 400', async () => {
      const { status, body } = await pedir('/direcciones/', {
        method: 'POST',
        body: JSON.stringify({ direccion: 'Calle 1', sector: 3 }),
      });

      expect(status).toBe(400);
      expect(Object.keys(body)).toEqual(['cliente']);
    });
  });

  describe('PUT /api/direcciones/{id}/', () => {
    it('responde 200 con el objeto completo', async () => {
      const { status, body } = await pedir('/direcciones/7/', {
        method: 'PUT',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      // El frontend hace `DirectionDetailDTO(**response.json())`.
      expect(status).toBe(200);
      expect(body).toMatchObject({ id: 7, cliente: 42, sector_str: 'Gamboa' });
    });

    it('id inexistente → 404', async () => {
      const { status } = await pedir('/direcciones/999/', {
        method: 'PUT',
        body: JSON.stringify(CUERPO_VALIDO),
      });

      expect(status).toBe(404);
    });
  });

  // ── Borrado ───────────────────────────────────────────────────────────────

  describe('DELETE /api/direcciones/{id}/', () => {
    it('sin servicios asociados → **204**', async () => {
      const { status } = await pedir('/direcciones/7/', { method: 'DELETE' });

      expect(status).toBe(204);
      expect(registro.borrado?.where).toEqual({ id: 7 });
    });

    it('con servicios asociados → se rechaza y el mensaje dice "servicio"', async () => {
      serviciosAsociados = 3;

      const { status, body } = await pedir('/direcciones/7/', { method: 'DELETE' });

      // El schema los desengancharía con SetNull, dejando servicios sin
      // dirección y sin rastro. El frontend busca "servicio" en el cuerpo para
      // mostrar un mensaje entendible.
      expect(status).toBe(409);
      expect(String(body.detail)).toContain('servicio');
      expect(registro.borrado).toBeUndefined();
    });

    it('id inexistente → 404', async () => {
      expect((await pedir('/direcciones/999/', { method: 'DELETE' })).status).toBe(404);
    });
  });
});
