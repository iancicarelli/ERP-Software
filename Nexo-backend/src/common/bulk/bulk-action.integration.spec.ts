import { Global, INestApplication, Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { ClientesModule } from '../../clientes/clientes.module';
import { OrdenesModule } from '../../ordenes/ordenes.module';
import { PagosModule } from '../../pagos/pagos.module';
import { PrismaService } from '../../prisma/prisma.service';
import { TransferenciasModule } from '../../transferencias/transferencias.module';
import { configureDrfLayer } from '../drf-layer';
import { MAX_SELECCION } from './bulk-action.dto';

/**
 * ============================================================================
 * `bulk-action` sobre HTTP — Fase 9
 * ----------------------------------------------------------------------------
 * **Un solo archivo para las cuatro entidades**, a diferencia del resto de los
 * tests de integración, que van uno por módulo. El motivo es que acá lo que se
 * prueba ES transversal: el mismo cuerpo, el mismo 200-y-no-201, el mismo tope
 * de selección y el mismo formato de error en `/clientes/`, `/ordenes/`,
 * `/pagos/` y `/transferencias/`. Repartirlo en cuatro archivos escondería que
 * es un contrato único y garantizaría que los cuatro se desincronicen.
 *
 * Los tests de listado y CRUD de cada entidad siguen en su archivo de siempre.
 * ============================================================================
 */

const SECTOR = { id: 3, sector: 'Nonguén', zona_id: 1, zona: { id: 1, zona: 'Concepción' } };

const CLIENTE = {
  id: 42,
  rut: '16.204.579-2',
  nombre1: 'Juan',
  nombre2: 'Pedro',
  nombre3: null,
  apellido1: 'Huentelicán',
  apellido2: 'Soto',
  email: 'juan@example.cl',
  tel: '+56 9 1234 5678',
  activo: false,
  por_instalar: true,
  moroso: false,
  direcciones: [{ id: 7, principal: true, sector: SECTOR }],
};

const PAGO = {
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
  cliente: {
    nombre1: 'Juan',
    nombre2: 'Pedro',
    apellido1: 'Huentelicán',
    apellido2: 'Soto',
    direcciones: [{ sector: SECTOR }],
  },
};

const ORDEN = {
  id: 123,
  koboid: 555,
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
  fecha_contrato: new Date('2026-08-01T00:00:00.000Z'),
  modificacion_plan: false,
  migracion: false,
  traslado: false,
  anexos_extras: 1,
  anexos_extras_exterior: 0,
  sintonizadores: 2,
  extensores_wifi: 0,
  metros_extras: 30,
  costo_metros_extras: 15000,
  pago_instalacion: true,
  costo_instalacion: 12000,
  monto: 19990,
  direccion: 'Los Aromos 123',
  coordenadas: '-36.82,-73.05',
  medidor_luz: false,
  ducto: false,
  metros_ducto: 0,
  poda: false,
  vecino: false,
  postacion: false,
  postes: 0,
  // Con salto de línea y punto y coma a propósito: es el caso que rompe el CSV
  // si el escapado falla.
  observacion_vendedor: 'Reja alta;\nllamar antes',
  observacion: null,
  abierto: true,
  evaluacion: false,
  bienvenida: false,
  comision: true,
  comision_pagada: false,
  fecha_pago: null,
  fecha_ingreso: new Date('2026-08-01T00:00:00.000Z'),
  fecha_programado: new Date('2026-08-20T14:30:00.000Z'),
  fecha_instalado: null,
  tecnico2: null,
  estado: { id: 1, estado: 'en_terreno' },
  causa: null,
  servicio: { id: 2, servicio: 'Internet 200 Megas' },
  vendedor: { nombre1: 'Ana', apellido1: 'Vera', apellido2: null },
  tecnico: { nombre1: 'Cristian', apellido1: 'Quiroz', apellido2: null },
  zona: { id: 1, zona: 'Concepción' },
  sector: SECTOR,
  notas: [
    {
      id: 1,
      nota: 'El cliente pide después de las 15:00',
      fecha_creacion: new Date('2026-08-05T12:00:00.000Z'),
      added_by: { username: 'admin' },
    },
  ],
};

/** Qué devuelven los `findMany`; cada test lo ajusta si necesita otra cosa. */
let clientes: unknown[] = [CLIENTE];
let pagos: unknown[] = [PAGO];
let ordenes: unknown[] = [ORDEN];

interface ArgsFindMany {
  where?: { id?: { in?: number[] } };
  select?: unknown;
}

/** `select: {id}` → solo ids; si no, las filas completas. */
function responder(args: ArgsFindMany, filas: unknown[]): Promise<unknown[]> {
  if (args.select) {
    const pedidos = args.where?.id?.in ?? [];
    return Promise.resolve(
      filas
        .filter((fila) => pedidos.includes((fila as { id: number }).id))
        .map((fila) => ({ id: (fila as { id: number }).id })),
    );
  }
  return Promise.resolve(filas);
}

const prismaFalso = {
  cliente: {
    findMany: (args: ArgsFindMany) => responder(args, clientes),
    aggregate: () =>
      Promise.resolve({
        _sum: { monto_total: 19990, deuda: 5000 },
        _count: { _all: 2 },
      }),
  },
  pago: {
    findMany: (args: ArgsFindMany) => responder(args, pagos),
    aggregate: () =>
      Promise.resolve({ _sum: { credit: 24990 }, _count: { _all: 1 } }),
  },
  ordenTrabajo: {
    findMany: (args: ArgsFindMany) => responder(args, ordenes),
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

@Module({
  imports: [
    PrismaFalsoModule,
    ClientesModule,
    OrdenesModule,
    PagosModule,
    TransferenciasModule,
  ],
})
class AppDeTestModule {}

describe('bulk-action sobre HTTP', () => {
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
    clientes = [CLIENTE];
    pagos = [PAGO];
    ordenes = [ORDEN];
  });

  const ejecutar = (
    entidad: string,
    action: string,
    selected_ids: number[] = [42],
  ): Promise<Response> =>
    fetch(`${baseUrl}/api/${entidad}/bulk-action/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, selected_ids }),
    });

  const json = async (respuesta: Response): Promise<Record<string, unknown>> =>
    (await respuesta.json()) as Record<string, unknown>;

  const HOY = new Date().toISOString().slice(0, 10);

  /**
   * `fetch()` decodifica el cuerpo con `TextDecoder`, que descarta el BOM solo:
   * para cuando llega acá, el archivo ya no lo tiene. Que el BOM SE EMITA se
   * verifica sobre los bytes crudos, en el test de más abajo.
   */
  const lineas = async (respuesta: Response): Promise<string[]> =>
    (await respuesta.text()).replace(/^\uFEFF/, '').split('\r\n');

  // ── El contrato compartido ────────────────────────────────────────────────

  describe('el contrato que comparten las cuatro entidades', () => {
    it('responde 200 y NO el 201 que Nest pone por default a los POST', async () => {
      // El frontend compara `response.status_code == 200` exacto: con un 201,
      // el diálogo no se abre y el archivo no se baja, sin ningún error visible.
      const respuesta = await ejecutar('clientes', 'sumar_montos_deuda_action');

      expect(respuesta.status).toBe(200);
    });

    it('rechaza una acción que la entidad no conoce, con el campo `action`', async () => {
      const respuesta = await ejecutar('clientes', 'exportar_pagos_csv');

      expect(respuesta.status).toBe(400);
      expect(await json(respuesta)).toEqual({
        action: ['Acción no soportada: "exportar_pagos_csv".'],
      });
    });

    it('rechaza la selección vacía', async () => {
      const respuesta = await ejecutar('clientes', 'sumar_montos_deuda_action', []);

      expect(respuesta.status).toBe(400);
      expect(await json(respuesta)).toHaveProperty('selected_ids');
    });

    it(`rechaza más de ${MAX_SELECCION} ids (R7)`, async () => {
      const demasiados = Array.from({ length: MAX_SELECCION + 1 }, (_, i) => i + 1);

      const respuesta = await ejecutar('pagos', 'sumar_pagos', demasiados);

      expect(respuesta.status).toBe(400);
      expect(String((await json(respuesta)).selected_ids)).toContain(
        String(MAX_SELECCION),
      );
    });

    it('rechaza ids que no son enteros positivos', async () => {
      const respuesta = await fetch(`${baseUrl}/api/clientes/bulk-action/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'sumar_montos_deuda_action', selected_ids: ['x'] }),
      });

      expect(respuesta.status).toBe(400);
      expect(await json(respuesta)).toHaveProperty('selected_ids');
    });
  });

  // ── Clientes ──────────────────────────────────────────────────────────────

  describe('clientes', () => {
    it('`sumar_montos_deuda_action` devuelve las cuatro claves del diálogo', async () => {
      const cuerpo = await json(await ejecutar('clientes', 'sumar_montos_deuda_action', [42, 7]));

      expect(cuerpo).toEqual({
        suma_monto_total: 19990,
        suma_deuda: 5000,
        cantidad_clientes: 2,
        message: 'Se sumaron 2 cliente(s) seleccionado(s).',
      });
    });

    it('avisa en el mensaje cuando se sumaron menos de los seleccionados', async () => {
      // El COUNT dice 2 y se seleccionaron 3: alguien borró un cliente entre
      // la selección y el clic.
      const cuerpo = await json(
        await ejecutar('clientes', 'sumar_montos_deuda_action', [42, 7, 99]),
      );

      expect(cuerpo.message).toBe('Se sumaron 2 de 3 cliente(s): el resto ya no existe.');
    });

    it('el CSV baja con nombre fechado en el Content-Disposition', async () => {
      const respuesta = await ejecutar('clientes', 'exportar_clientes_csv');

      expect(respuesta.headers.get('content-type')).toContain('text/csv');
      expect(respuesta.headers.get('content-disposition')).toBe(
        `attachment; filename="clientes_${HOY}.csv"`,
      );
    });

    it('el archivo empieza con el BOM de UTF-8, o Excel lo abre en Latin-1', async () => {
      const respuesta = await ejecutar('clientes', 'exportar_clientes_csv');
      const bytes = Buffer.from(await respuesta.arrayBuffer());

      expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    });

    it('el CSV replica las columnas de la tabla, en su orden', async () => {
      const [encabezado, primera] = await lineas(
        await ejecutar('clientes', 'exportar_clientes_csv'),
      );

      expect(encabezado).toBe('Nombre Completo;RUT;Email;Teléfono;Sector;Estado');
      // `nombre2` NO va: la tabla concatena nombre1 + apellidos y nada más.
      expect(primera).toBe(
        'Juan Huentelicán Soto;16.204.579-2;juan@example.cl;+56 9 1234 5678;Nonguén;Por instalar',
      );
    });
  });

  // ── Pagos ─────────────────────────────────────────────────────────────────

  describe('pagos', () => {
    it('`sumar_pagos` devuelve las tres claves del diálogo', async () => {
      const cuerpo = await json(await ejecutar('pagos', 'sumar_pagos', [7]));

      expect(cuerpo).toEqual({
        suma: 24990,
        elementos_seleccionados: 1,
        message: 'Se sumaron 1 pago(s).',
      });
    });

    it('abre en dos columnas las celdas que la tabla apila', async () => {
      const [encabezado, primera] = await lineas(
        await ejecutar('pagos', 'exportar_pagos_csv', [7]),
      );

      // "Identificación (RUT)" y "Control Fechas" son una celda cada una en
      // pantalla; en la planilla tienen que poder filtrarse por separado.
      expect(encabezado).toBe(
        'Existe;Cliente;RUT Cliente;RUT Voucher;Fecha;Fecha Ingreso;Fecha Vencimiento;Monto;Voucher Type;Voucher Number;Fiscal Year;Entry User;Document Type;Folio Number;Cliente Sector',
      );
      expect(primera).toBe(
        'Sí;Juan Pedro Huentelicán Soto;16.204.579-2;16.204.579-2;2026-08-14;2026-08-14;2026-09-13;24990;INGRESO;90001;2026;ADMIN;BOLETAELEC;SEED-P0001;Nonguén',
      );
    });

    it('el monto va sin `$` ni separador de miles, para que Excel lo sume', async () => {
      const texto = await (await ejecutar('pagos', 'exportar_pagos_csv', [7])).text();

      expect(texto).toContain(';24990;');
      expect(texto).not.toContain('$24.990');
    });
  });

  // ── Órdenes ───────────────────────────────────────────────────────────────

  describe('órdenes', () => {
    it('el CSV abre los iconos de la tabla en columnas Sí/No', async () => {
      const [encabezado, primera] = await lineas(
        await ejecutar('ordenes', 'exportar_ordenes_csv', [123]),
      );

      expect(encabezado).toBe(
        'KoboID;F. Contrato;Cliente;RUT;Contrato Nuevo;Migración;Traslado;Servicio;Zona;Sector;Coordenadas;Costo Instalación;Pago Instalación;Comisión;Comisión Pagada;Modificación de Plan;Orden;Fecha Programada;Fecha Instalación;Técnico;Estado',
      );
      expect(primera).toBe(
        // Las coordenadas salen entrecomilladas: llevan una coma adentro.
        // Sin eso, un parser que use coma partiría la fila justo ahí.
        '555;2026-08-01;Juan Huentelicán Soto;16.204.579-2;Sí;No;No;Internet 200 Megas;Concepción;Nonguén;"-36.82,-73.05";12000;Pagado;Sí;No;No;Abierta;2026-08-20T14:30;;Cristian Quiroz;en terreno',
      );
    });

    it('el PDF sale con la firma del formato y como adjunto', async () => {
      const respuesta = await ejecutar('ordenes', 'imprimir_orden_de_trabajo', [123]);
      const bytes = Buffer.from(await respuesta.arrayBuffer());

      expect(respuesta.status).toBe(200);
      expect(respuesta.headers.get('content-type')).toBe('application/pdf');
      // Una sola orden → el número en el nombre del archivo.
      expect(respuesta.headers.get('content-disposition')).toBe(
        'attachment; filename="orden_de_trabajo_123.pdf"',
      );
      expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
      expect(bytes.length).toBeGreaterThan(1000);
    });

    it('con varias órdenes el nombre del PDF es el fechado', async () => {
      ordenes = [ORDEN, { ...ORDEN, id: 124 }];

      const respuesta = await ejecutar('ordenes', 'imprimir_orden_de_trabajo', [123, 124]);
      await respuesta.arrayBuffer();

      expect(respuesta.headers.get('content-disposition')).toBe(
        `attachment; filename="ordenes_de_trabajo_${HOY}.pdf"`,
      );
    });

    it('rechaza imprimir más de 100 órdenes en un archivo', async () => {
      const muchas = Array.from({ length: 101 }, (_, i) => i + 1);

      const respuesta = await ejecutar('ordenes', 'imprimir_orden_de_trabajo', muchas);

      expect(respuesta.status).toBe(400);
      expect(String((await json(respuesta)).selected_ids)).toContain('100');
    });

    it('rechaza el PDF si ninguna orden seleccionada existe', async () => {
      // Un PDF de cero páginas es un archivo que el visor no puede abrir.
      ordenes = [];

      const respuesta = await ejecutar('ordenes', 'imprimir_orden_de_trabajo', [999]);

      expect(respuesta.status).toBe(400);
      expect((await json(respuesta)).detail).toBe(
        'Ninguna de las órdenes seleccionadas existe.',
      );
    });
  });

  // ── Transferencias ────────────────────────────────────────────────────────

  describe('transferencias', () => {
    it.each(['generar_voucher', 'eliminar_voucher'])(
      '`%s` responde 501: falta la integración externa (R2)',
      async (action) => {
        const respuesta = await ejecutar('transferencias', action, [3]);

        expect(respuesta.status).toBe(501);
        expect((await json(respuesta)).detail).toContain('facturación');
      },
    );

    it('una acción desconocida sigue siendo un 400, no un 501', async () => {
      const respuesta = await ejecutar('transferencias', 'exportar_todo', [3]);

      expect(respuesta.status).toBe(400);
      expect(await json(respuesta)).toHaveProperty('action');
    });
  });
});
