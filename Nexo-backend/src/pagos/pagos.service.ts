import { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';

import {
  csvComoStream,
  FilterEngine,
  lotesOrdenados,
  PaginationParams,
  RawQuery,
} from '../common';
import { PrismaService } from '../prisma/prisma.service';
import { COLUMNAS_CSV_PAGOS } from './pagos.csv';
import { PAGO_FILTERS } from './pagos.filters';
import { PAGO_INCLUDE, serializarPago } from './pagos.serializer';

/**
 * ============================================================================
 * Pagos — Fase 8
 * ----------------------------------------------------------------------------
 * **Solo lectura, por decisión (D10).** No hay POST ni PUT y no es un recorte
 * de alcance: el frontend no tiene pantalla de alta ni de edición de pagos
 * —`states/payments/` son un table state y un actions state, nada más—, así
 * que un endpoint de escritura no tendría quién lo llame.
 *
 * De dónde salen los pagos en producción sigue abierto (R3): la ingesta desde
 * el sistema externo va como entregable aparte, en cuanto se conozca el
 * formato. Hasta entonces los datos son los del seed de desarrollo.
 * ============================================================================
 */
@Injectable()
export class PagosService {
  private readonly engine = new FilterEngine(PAGO_FILTERS);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listado paginado. El `orderBy` no es cosmético: sin un orden total,
   * Postgres puede devolver las filas en cualquier orden entre dos consultas y
   * la paginación repetiría u omitiría pagos al cambiar de página.
   *
   * Se ordena por `date desc` —lo último cobrado primero, que es lo que uno
   * quiere ver al abrir la pantalla— con `id desc` de desempate, porque `date`
   * no es única: un día con veinte pagos no define un orden por sí solo.
   */
  async listar(
    query: RawQuery,
    { skip, take }: PaginationParams,
  ): Promise<[number, Record<string, unknown>[]]> {
    const { where } = this.engine.build(query);

    const [count, filas] = await this.prisma.$transaction([
      this.prisma.pago.count({ where }),
      this.prisma.pago.findMany({
        where,
        include: PAGO_INCLUDE,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    return [count, filas.map(serializarPago)];
  }

  /**
   * `GET /api/pagos/all-ids/` — el MISMO `where` que el listado (§3.8). Si
   * divergieran, "seleccionar todo" marcaría pagos que el usuario no está
   * viendo y la suma de la Fase 9 saldría mal sin que nadie lo note.
   *
   * ⚠️ Sigue sin tope propio: con la tabla llena devuelve decenas de miles de
   * ids. Lo que cierra R7 es el otro extremo — `MAX_SELECCION` en
   * `common/bulk/bulk-action.dto.ts` rechaza la selección al ejecutar la
   * acción, que es donde el volumen se vuelve caro (Fase 9). Acá el costo es
   * un `SELECT id`, y ponerle tope significaría mentirle al frontend sobre
   * cuántas filas matchean.
   */
  async todosLosIds(query: RawQuery): Promise<number[]> {
    const { where } = this.engine.build(query);

    const filas = await this.prisma.pago.findMany({
      where,
      select: { id: true },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });

    return filas.map((fila) => fila.id);
  }

  /**
   * `sumar_pagos` — ROADMAP §3.9. Una agregación, sin traer filas.
   *
   * `elementos_seleccionados` sale del COUNT y no de `ids.length`: informa lo
   * que realmente se sumó. Misma decisión que en clientes.
   */
  async sumar(ids: number[]): Promise<Record<string, unknown>> {
    const resumen = await this.prisma.pago.aggregate({
      where: { id: { in: ids } },
      _sum: { credit: true },
      _count: { _all: true },
    });

    const elementos_seleccionados = resumen._count._all;

    return {
      // `_sum` es `null` si no matcheó nada; `PaymentActionsState.result_suma`
      // es un entero pelado y un null lo dejaría en 0 igual, pero sin avisar.
      suma: resumen._sum.credit ?? 0,
      elementos_seleccionados,
      message: `Se sumaron ${elementos_seleccionados} pago(s).`,
    };
  }

  /**
   * `exportar_pagos_csv`. El `orderBy` es el del listado (`date desc, id
   * desc`), así que el archivo sale en el mismo orden que la pantalla.
   */
  exportarCsv(ids: number[]): Readable {
    const orden = [{ date: 'desc' as const }, { id: 'desc' as const }];

    return csvComoStream(
      COLUMNAS_CSV_PAGOS,
      lotesOrdenados(
        async () => {
          const filas = await this.prisma.pago.findMany({
            where: { id: { in: ids } },
            select: { id: true },
            orderBy: orden,
          });
          return filas.map((fila) => fila.id);
        },
        (lote) =>
          this.prisma.pago.findMany({
            where: { id: { in: lote } },
            include: PAGO_INCLUDE,
            orderBy: orden,
          }),
      ),
    );
  }
}
