import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { FilterEngine, nombreDelConstraint, PaginationParams, RawQuery } from '../common';
import { PrismaService } from '../prisma/prisma.service';
import { AsignarClienteDto } from './dto/transferencia.dto';
import { TRANSFERENCIA_FILTERS } from './transferencias.filters';
import {
  serializarTransferencia,
  TRANSFERENCIA_INCLUDE,
} from './transferencias.serializer';

/**
 * ============================================================================
 * Transferencias — Fase 8
 * ----------------------------------------------------------------------------
 * Como pagos, es una entidad de conciliación: los datos llegan del banco, no de
 * un formulario. La diferencia es que acá SÍ hay un write, uno solo: asignar el
 * cliente al que corresponde una transferencia suelta.
 * ============================================================================
 */
@Injectable()
export class TransferenciasService {
  private readonly engine = new FilterEngine(TRANSFERENCIA_FILTERS);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listado paginado, `fecha desc` con `id desc` de desempate — misma razón que
   * en pagos: `fecha` no es única, y sin orden total la paginación se
   * desordena entre páginas.
   */
  async listar(
    query: RawQuery,
    { skip, take }: PaginationParams,
  ): Promise<[number, Record<string, unknown>[]]> {
    const { where } = this.engine.build(query);

    const [count, filas] = await this.prisma.$transaction([
      this.prisma.transferencia.count({ where }),
      this.prisma.transferencia.findMany({
        where,
        include: TRANSFERENCIA_INCLUDE,
        orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    return [count, filas.map(serializarTransferencia)];
  }

  /** Mismo `where` que el listado (§3.8). Ver la nota de R7 en `pagos.service.ts`. */
  async todosLosIds(query: RawQuery): Promise<number[]> {
    const { where } = this.engine.build(query);

    const filas = await this.prisma.transferencia.findMany({
      where,
      select: { id: true },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    });

    return filas.map((fila) => fila.id);
  }

  /**
   * Asigna el cliente de una transferencia. Devuelve **200 con el objeto
   * completo**: el frontend solo mira el status (`if response.status_code !=
   * 200`) y después recarga la tabla, pero devolver el objeto mantiene la misma
   * forma que el resto de los updates del sistema y le da a un consumidor
   * futuro la fila ya reconciliada sin pedirla de nuevo.
   *
   * Es deliberadamente una asignación y no un update general: el único campo
   * escribible es `cliente`. Ver `dto/transferencia.dto.ts`.
   */
  async asignarCliente(
    id: number,
    dto: AsignarClienteDto,
  ): Promise<Record<string, unknown>> {
    await this.existeOFalla(id);

    try {
      const transferencia = await this.prisma.transferencia.update({
        where: { id },
        data: { cliente_id: dto.cliente },
        include: TRANSFERENCIA_INCLUDE,
      });
      return serializarTransferencia(transferencia);
    } catch (error) {
      throw traducirErrorDePrisma(error);
    }
  }

  private async existeOFalla(id: number): Promise<void> {
    const existe = await this.prisma.transferencia.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existe) throw new NotFoundException('No encontrado.');
  }
}

/**
 * Solo puede fallar una FK acá, así que el mapeo es de una sola entrada. Se
 * traduce igual en vez de dejar pasar el P2003: sin esto, elegir un cliente
 * recién borrado por otra sesión daría un 500 en vez del 400 por campo que el
 * diálogo sabe mostrar.
 */
function traducirErrorDePrisma(error: unknown): unknown {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;

  if (error.code === 'P2003' && nombreDelConstraint(error.meta).includes('cliente')) {
    return new BadRequestException({
      cliente: ['El cliente indicado no existe.'],
    });
  }

  return error;
}
