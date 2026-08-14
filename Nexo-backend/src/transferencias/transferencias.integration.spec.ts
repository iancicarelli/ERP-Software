import { Global, INestApplication, Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Prisma } from '@prisma/client';

import { configureDrfLayer } from '../common/drf-layer';
import { PrismaService } from '../prisma/prisma.service';
import { TransferenciasModule } from './transferencias.module';

/**
 * ============================================================================
 * Test de integración de `/api/transferencias/` sobre HTTP — Fase 8
 * ----------------------------------------------------------------------------
 * Además de la serialización, acá se cubre el **único write de la fase**:
 * asignar cliente a una transferencia suelta.
 *
 * Dos cosas se verifican que no son obvias:
 *   · PATCH y PUT tienen que estar los DOS registrados (el frontend manda
 *     PATCH, el ROADMAP §3.7 documenta PUT),
 *   · el write toca `cliente_id` y NADA más — el importe y la fecha vienen del
 *     banco y el operador no los edita.
 * ============================================================================
 */

const CLIENTE = {
  id: 42,
  rut: '19.553.118-K',
  nombre1: 'Javiera',
  nombre2: null,
  apellido1: 'Contreras',
  apellido2: 'Vidal',
  direcciones: [
    {
      id: 1,
      principal: true,
      sector: { id: 5, sector: 'Boca Sur', zona: { id: 3, zona: 'San Pedro de la Paz' } },
    },
  ],
};

const FILA = {
  id: 7,
  cliente_id: 42,
  fecha: new Date('2026-08-14T00:00:00.000Z'),
  rut_transferencia: '19.553.118-K',
  nombre: 'Javiera Contreras Vidal',
  banco_origen: 'Banco Credito Inversiones',
  cuenta_destino: '000-12345678-9',
  monto: 32990,
  estado: 'Ok',
  codigo_transferencia: 'SEED-T0001',
  voucher_generado: null,
  documento_pagado: true,
  documento_venta: 'FV-4200',
  documento_vencimiento: new Date('2026-09-13T00:00:00.000Z'),
  created_at: new Date(),
  cliente: CLIENTE,
};

/** Transferencia sin conciliar, con todas las columnas opcionales en `null`. */
const FILA_VACIA = {
  ...FILA,
  id: 8,
  cliente_id: null,
  rut_transferencia: null,
  nombre: null,
  banco_origen: null,
  cuenta_destino: null,
  estado: null,
  codigo_transferencia: null,
  documento_pagado: false,
  documento_venta: null,
  documento_vencimiento: null,
  cliente: null,
};

interface Registro {
  findMany?: { where?: unknown; orderBy?: unknown; skip?: number; take?: number };
  count?: { where?: unknown };
  update?: { where?: unknown; data?: Record<string, unknown> };
}

const registro: Registro = {};

let filas: unknown[] = [FILA];
/** `null` fuerza el 404 del write. */
let filaExistente: typeof FILA | null = FILA;

const prismaFalso = {
  transferencia: {
    count: (args: { where: unknown }) => {
      registro.count = args;
      return Promise.resolve(filas.length);
    },
    findMany: (args: Registro['findMany']) => {
      registro.findMany = args;
      return Promise.resolve(filas);
    },
    findUnique: ({ where }: { where: { id: number } }) =>
      Promise.resolve(where.id === FILA.id ? filaExistente : null),
    update: (args: { where: unknown; data: Record<string, unknown> }) => {
      registro.update = args;

      // 99999 = "este cliente no existe". El `meta` es el que devuelve Prisma 6
      // de verdad, capturado provocando el error contra la base.
      if (args.data.cliente_id === 99999) {
        return Promise.reject(
          new Prisma.PrismaClientKnownRequestError('FK constraint failed', {
            code: 'P2003',
            clientVersion: '6.0.0',
            meta: {
              modelName: 'Transferencia',
              constraint: 'transferencias_cliente_id_fkey',
            },
          }),
        );
      }

      return Promise.resolve({ ...FILA, cliente_id: args.data.cliente_id });
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

@Module({ imports: [PrismaFalsoModule, TransferenciasModule] })
class AppDeTestModule {}

describe('Transferencias sobre HTTP', () => {
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
    filas = [FILA];
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

  const primeraFila = async () => {
    const { body } = await pedir('/transferencias/');
    return (body.results as Record<string, unknown>[])[0];
  };

  // ── Serialización ─────────────────────────────────────────────────────────

  describe('GET /api/transferencias/', () => {
    it('emite las claves de TransferenciaDTO, todas en snake_case', async () => {
      const fila = await primeraFila();

      expect(fila).toMatchObject({
        id: 7,
        fecha: '2026-08-14',
        cliente_str: 'Javiera Contreras Vidal',
        rut_transferencia: '19.553.118-K',
        nombre: 'Javiera Contreras Vidal',
        banco_origen: 'Banco Credito Inversiones',
        cuenta_destino: '000-12345678-9',
        estado: 'Ok',
        codigo_transferencia: 'SEED-T0001',
        cliente_existe: true,
        documento_pagado: true,
        documento_venta: 'FV-4200',
        documento_vencimiento: '2026-09-13',
      });
    });

    it('`monto` sale como entero (D5), no como texto', async () => {
      // El DTO lo declara `str` y `transform_item` hace `str(...)`, así que
      // convierte lo que llegue. Mandar el número respeta D5 y no obliga a
      // parsear texto para sumar.
      const fila = await primeraFila();
      expect(fila.monto).toBe(32990);
    });

    it('resuelve sector y zona por la dirección principal (D4)', async () => {
      const fila = await primeraFila();

      expect(fila.cliente_sector).toBe('Boca Sur');
      expect(fila.cliente_zona).toBe('San Pedro de la Paz');
    });

    it('`voucher_generado` sale vacío: lo produce la Fase 9', async () => {
      const fila = await primeraFila();
      expect(fila.voucher_generado).toBe('');
    });

    it('ningún campo sale en null en una transferencia sin conciliar', async () => {
      filas = [FILA_VACIA];
      const fila = await primeraFila();

      const nulos = Object.entries(fila)
        .filter(([, valor]) => valor === null)
        .map(([clave]) => clave);

      expect(nulos).toEqual([]);
      expect(fila.cliente_existe).toBe(false);
      expect(fila.cliente_str).toBe('');
    });

    it('un `estado` vacío NO se inventa como "Pendiente"', async () => {
      // La etiqueta "Pendiente" la pone la vista (`transform_item` hace
      // `or "Pendiente"`). Emitirla desde el backend la volvería un valor real
      // y filtrable, cuando en la base no existe.
      filas = [FILA_VACIA];
      expect((await primeraFila()).estado).toBe('');
    });

    it('ordena por fecha desc con id de desempate', async () => {
      await pedir('/transferencias/');
      expect(registro.findMany?.orderBy).toEqual([
        { fecha: 'desc' },
        { id: 'desc' },
      ]);
    });
  });

  describe('GET /api/transferencias/all-ids/', () => {
    it('aplica el mismo `where` que el listado (§3.8)', async () => {
      await pedir('/transferencias/?estado=Ok&cliente_existe=true');
      const whereDelListado = registro.findMany?.where;

      await pedir('/transferencias/all-ids/?estado=Ok&cliente_existe=true');
      expect(registro.findMany?.where).toEqual(whereDelListado);
    });
  });

  // ── El único write ────────────────────────────────────────────────────────

  describe('asignar cliente', () => {
    it('PATCH devuelve 200 con el objeto ya reconciliado', async () => {
      // Es el verbo que manda `TransferAssignClientState.save_assignment()`, y
      // el estado que compara (`!= 200` → muestra error).
      const { status, body } = await pedir('/transferencias/7/', {
        method: 'PATCH',
        body: JSON.stringify({ cliente: 42 }),
      });

      expect(status).toBe(200);
      expect(body.id).toBe(7);
      expect(body.cliente_existe).toBe(true);
    });

    it('PUT hace lo mismo: el ROADMAP §3.7 documenta ese verbo', async () => {
      // Los dos decoradores NO pueden apilarse sobre un mismo método —Nest
      // guarda un solo verbo por handler y el segundo pisa al primero—, así que
      // este test es lo que detecta que el alias se perdió.
      const { status, body } = await pedir('/transferencias/7/', {
        method: 'PUT',
        body: JSON.stringify({ cliente: 42 }),
      });

      expect(status).toBe(200);
      expect(body.id).toBe(7);
    });

    it('toca `cliente_id` y NADA más', async () => {
      // El importe, la fecha y el banco vienen de la cartola: el operador
      // concilia, no edita.
      await pedir('/transferencias/7/', {
        method: 'PATCH',
        body: JSON.stringify({ cliente: 42 }),
      });

      expect(registro.update?.data).toEqual({ cliente_id: 42 });
    });

    it('descarta cualquier otra clave del cuerpo (whitelist)', async () => {
      // Si el diálogo algún día reenviara la transferencia entera, el guardado
      // tiene que seguir funcionando sin escribir lo que no corresponde.
      await pedir('/transferencias/7/', {
        method: 'PATCH',
        body: JSON.stringify({ cliente: 42, monto: 1, estado: 'Ok' }),
      });

      expect(registro.update?.data).toEqual({ cliente_id: 42 });
    });

    it('404 con forma DRF si la transferencia no existe', async () => {
      filaExistente = null;

      const { status, body } = await pedir('/transferencias/7/', {
        method: 'PATCH',
        body: JSON.stringify({ cliente: 42 }),
      });

      expect(status).toBe(404);
      expect(body).toEqual({ detail: 'No encontrado.' });
    });

    it('400 por campo si el cliente no existe', async () => {
      // Sin traducir el P2003 esto sería un 500 y el diálogo no tendría qué
      // mostrar.
      const { status, body } = await pedir('/transferencias/7/', {
        method: 'PATCH',
        body: JSON.stringify({ cliente: 99999 }),
      });

      expect(status).toBe(400);
      expect(body).toEqual({ cliente: ['El cliente indicado no existe.'] });
    });

    it('400 si `cliente` viene en 0 — es un diálogo sin selección', async () => {
      const { status, body } = await pedir('/transferencias/7/', {
        method: 'PATCH',
        body: JSON.stringify({ cliente: 0 }),
      });

      expect(status).toBe(400);
      expect(body).toEqual({ cliente: ['Debe seleccionar un cliente.'] });
      expect(registro.update).toBeUndefined();
    });

    it('400 si `cliente` falta o no es un entero', async () => {
      for (const cuerpo of [{}, { cliente: 'cuarenta y dos' }, { cliente: 1.5 }]) {
        const { status } = await pedir('/transferencias/7/', {
          method: 'PATCH',
          body: JSON.stringify(cuerpo),
        });

        expect(status).toBe(400);
      }
    });
  });

  describe('lo que no existe', () => {
    it.each(['POST', 'DELETE'])(
      '%s no está implementado: no hay alta ni borrado de transferencias',
      async (method) => {
        const response = await fetch(`${baseUrl}/api/transferencias/`, {
          method,
          headers: { 'content-type': 'application/json' },
          body: method === 'DELETE' ? undefined : '{}',
        });

        expect(response.status).toBe(404);
      },
    );
  });
});
