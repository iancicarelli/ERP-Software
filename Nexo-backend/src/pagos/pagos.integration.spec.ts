import { Global, INestApplication, Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { configureDrfLayer } from '../common/drf-layer';
import { PrismaService } from '../prisma/prisma.service';
import { PagosModule } from './pagos.module';

/**
 * ============================================================================
 * Test de integración de `/api/pagos/` sobre HTTP — Fase 8
 * ----------------------------------------------------------------------------
 * Mismo enfoque que las fases anteriores: Nest real en un puerto efímero,
 * Prisma de mentira que registra con qué lo llamaron.
 *
 * Lo que se protege acá es la **forma de la respuesta**, que en pagos es más
 * frágil que en el resto:
 *   · nueve campos van en camelCase y nueve más en snake_case (el mismo dato),
 *   · ningún valor puede salir en `null`, o `PaymentDTO` no valida y la tabla
 *     entera queda vacía sin un error visible.
 * ============================================================================
 */

const CLIENTE = {
  id: 42,
  rut: '16.204.579-2',
  nombre1: 'Camila',
  nombre2: 'Andrea',
  apellido1: 'Fuentes',
  apellido2: 'Rojas',
  direcciones: [
    {
      id: 1,
      principal: true,
      sector: { id: 3, sector: 'Nonguén', zona: { id: 1, zona: 'Concepción' } },
    },
  ],
};

/** Pago conciliado, con todas las columnas opcionales cargadas. */
const FILA = {
  id: 7,
  cliente_id: 42,
  cliente_rut: '16.204.579-2',
  voucher_rut: '16.204.579-2',
  voucher_type: 'INGRESO',
  voucher_number: 90001,
  fiscal_year: 2026,
  date: new Date('2026-08-14T00:00:00.000Z'),
  entry_date: new Date('2026-08-14T00:00:00.000Z'),
  entry_user: 'ADMIN',
  credit: 24990,
  document_type: 'BOLETAELEC',
  folio_number: 'SEED-P0001',
  expiration_date: new Date('2026-09-13T00:00:00.000Z'),
  created_at: new Date(),
  cliente: CLIENTE,
};

/**
 * Pago SIN conciliar y con **todas** las columnas opcionales en `null`. Es el
 * caso que rompe la tabla si el serializer deja pasar un solo `null`.
 */
const FILA_VACIA = {
  id: 8,
  cliente_id: null,
  cliente_rut: null,
  voucher_rut: null,
  voucher_type: null,
  voucher_number: null,
  fiscal_year: null,
  date: new Date('2026-08-14T00:00:00.000Z'),
  entry_date: null,
  entry_user: null,
  credit: 0,
  document_type: null,
  folio_number: null,
  expiration_date: null,
  created_at: new Date(),
  cliente: null,
};

interface Registro {
  findMany?: { where?: unknown; orderBy?: unknown; skip?: number; take?: number };
  count?: { where?: unknown };
}

const registro: Registro = {};

/** Filas que devuelve el findMany; los tests la cambian. */
let filas: unknown[] = [FILA];

const prismaFalso = {
  pago: {
    count: (args: { where: unknown }) => {
      registro.count = args;
      return Promise.resolve(filas.length);
    },
    findMany: (args: Registro['findMany']) => {
      registro.findMany = args;
      return Promise.resolve(filas);
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

@Module({ imports: [PrismaFalsoModule, PagosModule] })
class AppDeTestModule {}

describe('Pagos sobre HTTP', () => {
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
  });

  const pedir = async (
    path: string,
  ): Promise<{ status: number; body: Record<string, unknown> }> => {
    const response = await fetch(`${baseUrl}/api${path}`);
    const texto = await response.text();
    return {
      status: response.status,
      body: texto ? (JSON.parse(texto) as Record<string, unknown>) : {},
    };
  };

  const primeraFila = async (path = '/pagos/') => {
    const { body } = await pedir(path);
    return (body.results as Record<string, unknown>[])[0];
  };

  // ── Serialización ─────────────────────────────────────────────────────────

  describe('GET /api/pagos/', () => {
    it('emite los nueve campos que el frontend lee en camelCase', async () => {
      // `PaymentTableState.transform_item()` los lee así y solo así: sin estas
      // claves, esas nueve columnas quedan en blanco sin ningún error.
      const fila = await primeraFila();

      expect(fila).toMatchObject({
        voucherRut: '16.204.579-2',
        voucherType: 'INGRESO',
        voucherNumber: 90001,
        fiscalYear: 2026,
        entryDate: '2026-08-14',
        entryUser: 'ADMIN',
        documentType: 'BOLETAELEC',
        folioNumber: 'SEED-P0001',
        expirationDate: '2026-09-13',
      });
    });

    it('emite además el alias snake_case de cada uno (D2)', async () => {
      const fila = await primeraFila();

      expect(fila).toMatchObject({
        voucher_rut: '16.204.579-2',
        voucher_type: 'INGRESO',
        voucher_number: 90001,
        fiscal_year: 2026,
        entry_date: '2026-08-14',
        entry_user: 'ADMIN',
        document_type: 'BOLETAELEC',
        folio_number: 'SEED-P0001',
        expiration_date: '2026-09-13',
      });
    });

    it('las fechas salen como YYYY-MM-DD, sin hora ni zona', async () => {
      const fila = await primeraFila();

      expect(fila.date).toBe('2026-08-14');
      expect(fila.entryDate).toBe('2026-08-14');
      expect(fila.expirationDate).toBe('2026-09-13');
    });

    it('resuelve el nombre y la ubicación del cliente', async () => {
      const fila = await primeraFila();

      expect(fila.cliente_str).toBe('Camila Andrea Fuentes Rojas');
      expect(fila.cliente_rut).toBe('16.204.579-2');
      // Sector y zona salen de la dirección principal (D4).
      expect(fila.cliente_sector).toBe('Nonguén');
      expect(fila.cliente_zona).toBe('Concepción');
    });

    it('`cliente_existe` refleja si hay `cliente_id`, no si hay RUT', async () => {
      expect((await primeraFila()).cliente_existe).toBe(true);

      filas = [FILA_VACIA];
      expect((await primeraFila()).cliente_existe).toBe(false);
    });
  });

  describe('un pago sin conciliar no rompe PaymentDTO', () => {
    it('ningún campo sale en null, ni siquiera con todo el registro vacío', async () => {
      filas = [FILA_VACIA];
      const fila = await primeraFila();

      const nulos = Object.entries(fila)
        .filter(([, valor]) => valor === null)
        .map(([clave]) => clave);

      expect(nulos).toEqual([]);
    });

    it('los enteros opcionales salen en 0, no en null', async () => {
      // `PaymentDTO` los declara `int` pelado y `transform_item` usa
      // `item.get("voucherNumber", 0)`: ese default cubre la clave ausente, NO
      // la clave presente con None. Un null acá revienta Pydantic.
      filas = [FILA_VACIA];
      const fila = await primeraFila();

      expect(fila.voucherNumber).toBe(0);
      expect(fila.voucher_number).toBe(0);
      expect(fila.fiscalYear).toBe(0);
      expect(fila.fiscal_year).toBe(0);
    });

    it('los textos y fechas opcionales salen en cadena vacía', async () => {
      filas = [FILA_VACIA];
      const fila = await primeraFila();

      expect(fila.cliente_str).toBe('');
      expect(fila.cliente_rut).toBe('');
      expect(fila.cliente_sector).toBe('');
      expect(fila.entryDate).toBe('');
      expect(fila.expirationDate).toBe('');
    });
  });

  // ── Contrato de listado ───────────────────────────────────────────────────

  describe('paginación', () => {
    it('responde con la envoltura DRF', async () => {
      const { body } = await pedir('/pagos/');

      expect(Object.keys(body).sort()).toEqual([
        'count',
        'next',
        'previous',
        'results',
      ]);
    });

    it('`next` es null en la última página', async () => {
      // Los dropdowns del frontend paginan en bucle hasta que sea null: si
      // nunca lo fuera, bucle infinito.
      const { body } = await pedir('/pagos/');
      expect(body.next).toBeNull();
    });

    it('`limit=1` es alias de `page_size`, que es como cuenta el dashboard', async () => {
      await pedir('/pagos/?limit=1');
      expect(registro.findMany?.take).toBe(1);
    });
  });

  describe('orden', () => {
    it('ordena por fecha desc con id de desempate', async () => {
      // Sin orden total, la paginación repite u omite filas entre páginas.
      await pedir('/pagos/');
      expect(registro.findMany?.orderBy).toEqual([{ date: 'desc' }, { id: 'desc' }]);
    });
  });

  describe('GET /api/pagos/all-ids/', () => {
    it('devuelve `{ids: [...]}`', async () => {
      filas = [FILA, FILA_VACIA];
      const { body } = await pedir('/pagos/all-ids/');

      expect(body).toEqual({ ids: [7, 8] });
    });

    it('aplica EXACTAMENTE el mismo `where` que el listado (§3.8)', async () => {
      // Si divergieran, "seleccionar todo" marcaría pagos que el usuario no
      // está viendo.
      await pedir('/pagos/?cliente_existe=true&fiscalYear=2026');
      const whereDelListado = registro.findMany?.where;

      await pedir('/pagos/all-ids/?cliente_existe=true&fiscalYear=2026');
      expect(registro.findMany?.where).toEqual(whereDelListado);
    });

    it('no pagina: `all-ids` ignora `page_size`', async () => {
      await pedir('/pagos/all-ids/?page_size=1');

      expect(registro.findMany?.take).toBeUndefined();
      expect(registro.findMany?.skip).toBeUndefined();
    });
  });

  // ── Lo que NO existe ──────────────────────────────────────────────────────

  describe('solo lectura (D10)', () => {
    it.each(['POST', 'PUT', 'DELETE'])(
      '%s /api/pagos/ no está implementado',
      async (method) => {
        // Los pagos entran por ingesta, no por formulario: el frontend no
        // tiene pantalla de alta ni de edición.
        const response = await fetch(`${baseUrl}/api/pagos/`, {
          method,
          headers: { 'content-type': 'application/json' },
          body: method === 'DELETE' ? undefined : '{}',
        });

        expect(response.status).toBe(404);
      },
    );
  });
});
