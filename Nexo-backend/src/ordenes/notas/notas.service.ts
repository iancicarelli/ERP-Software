import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { FilterEngine, FilterMap, PaginationParams, RawQuery } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotaWriteDto } from './dto/nota.dto';
import { NOTA_INCLUDE, serializarNota } from './notas.serializer';

/**
 * El único filtro que manda el frontend
 * (`params={"orden_trabajo_id": orden_id, "page_size": 100}`).
 *
 * Ojo con la asimetría de nombres, que viene del contrato y no se inventó acá:
 * al **filtrar** la clave es `orden_trabajo_id`, al **crear** es
 * `orden_trabajo`. Son dos nombres para lo mismo.
 */
const NOTA_FILTERS: FilterMap = {
  orden_trabajo_id: { type: 'exact', field: 'orden_trabajo_id', cast: 'int' },
};

/**
 * ============================================================================
 * Notas de orden — Fase 7
 * ----------------------------------------------------------------------------
 * `GET /api/notas-ordenes/?orden_trabajo_id=` y `POST /api/notas-ordenes/`.
 * No hay PUT ni DELETE: el frontend solo lista y agrega. Una nota es un
 * registro de lo que pasó, y editarla a posteriori le quitaría el sentido.
 * ============================================================================
 */
@Injectable()
export class NotasService {
  private readonly engine = new FilterEngine(NOTA_FILTERS);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ⚠️ **Sin `orden_trabajo_id` devuelve TODAS las notas de todas las órdenes.**
   * Es coherente con el resto de los listados (un filtro ausente no filtra) y
   * el frontend siempre lo manda; queda anotado porque en una pantalla futura
   * sin ese param el usuario vería notas de órdenes ajenas.
   *
   * Orden `id desc` —la más nueva primero—, igual que los demás listados, y
   * obligatorio para que la paginación sea estable.
   */
  async listar(
    query: RawQuery,
    { skip, take }: PaginationParams,
  ): Promise<[number, Record<string, unknown>[]]> {
    const { where } = this.engine.build(query);

    const [count, filas] = await this.prisma.$transaction([
      this.prisma.notaOrden.count({ where }),
      this.prisma.notaOrden.findMany({
        where,
        include: NOTA_INCLUDE,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
    ]);

    return [count, filas.map(serializarNota)];
  }

  /**
   * POST → **201** (lo que compara el frontend).
   *
   * `added_by` sale del token, nunca del payload: el `@CurrentUser()` lo dejó
   * el `JwtAuthGuard`. La ruta está protegida como todo lo demás, así que
   * `usuarioId` siempre llega; se acepta `null` solo por robustez de tipos.
   */
  async crear(
    dto: NotaWriteDto,
    usuarioId: number | null,
  ): Promise<Record<string, unknown>> {
    try {
      const nota = await this.prisma.notaOrden.create({
        data: {
          orden_trabajo_id: dto.orden_trabajo,
          nota: dto.nota.trim(),
          added_by_id: usuarioId,
        },
        include: NOTA_INCLUDE,
      });

      return serializarNota(nota);
    } catch (error) {
      // P2003: la orden no existe. Sin traducir saldría como 500 y el frontend
      // mostraría "Error al crear nota: 500" sin decir qué pasó.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException({
          orden_trabajo: ['La orden de trabajo indicada no existe.'],
        });
      }

      throw error;
    }
  }
}
