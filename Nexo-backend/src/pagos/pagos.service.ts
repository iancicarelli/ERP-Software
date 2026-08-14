import { Injectable } from '@nestjs/common';

import { FilterEngine, PaginationParams, RawQuery } from '../common';
import { PrismaService } from '../prisma/prisma.service';
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
   * ⚠️ Sin tope (R7): con la tabla llena esto puede devolver decenas de miles
   * de ids. El límite duro se decide junto con `bulk-action` en la Fase 9,
   * donde está el consumidor real.
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
}
