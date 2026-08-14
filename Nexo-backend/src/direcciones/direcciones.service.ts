import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  FilterEngine,
  FilterMap,
  nombreDelConstraint,
  PaginationParams,
  RawQuery,
} from '../common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DIRECCION_INCLUDE,
  serializarDireccion,
} from './direcciones.serializer';
import { DireccionWriteDto } from './dto/direccion.dto';

/**
 * Filtros de `/api/direcciones/`. Uno solo: la tabla de direcciones vive
 * dentro del detalle del cliente y siempre pide `?cliente_id=`
 * (`DirectionTableState.get_filters()`), igual que el dropdown de direcciones
 * del formulario de servicio.
 */
export const DIRECCION_FILTERS: FilterMap = {
  cliente_id: { type: 'exact', field: 'cliente_id', cast: 'int' },
};

@Injectable()
export class DireccionesService {
  private readonly engine = new FilterEngine(DIRECCION_FILTERS);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listado paginado. Orden: la principal primero y después por id — es el
   * orden en el que tienen sentido en la tabla del detalle de cliente, y es
   * determinista, que es lo que la paginación necesita.
   */
  async listar(
    query: RawQuery,
    { skip, take }: PaginationParams,
  ): Promise<[number, Record<string, unknown>[]]> {
    const { where } = this.engine.build(query);

    const [count, filas] = await this.prisma.$transaction([
      this.prisma.direccion.count({ where }),
      this.prisma.direccion.findMany({
        where,
        include: DIRECCION_INCLUDE,
        orderBy: [{ principal: 'desc' }, { id: 'asc' }],
        skip,
        take,
      }),
    ]);

    return [count, filas.map(serializarDireccion)];
  }

  async obtener(id: number): Promise<Record<string, unknown>> {
    const direccion = await this.prisma.direccion.findUnique({
      where: { id },
      include: DIRECCION_INCLUDE,
    });

    if (!direccion) throw new NotFoundException('No encontrado.');

    return serializarDireccion(direccion);
  }

  async crear(dto: DireccionWriteDto): Promise<Record<string, unknown>> {
    return this.enTransaccionConPrincipalUnica(dto.cliente, dto.principal, async (tx) => {
      try {
        return await tx.direccion.create({
          data: aDatosPrisma(dto),
          include: DIRECCION_INCLUDE,
        });
      } catch (error) {
        throw traducirErrorDePrisma(error);
      }
    });
  }

  async actualizar(
    id: number,
    dto: DireccionWriteDto,
  ): Promise<Record<string, unknown>> {
    await this.existeOFalla(id);

    return this.enTransaccionConPrincipalUnica(
      dto.cliente,
      dto.principal,
      async (tx) => {
        try {
          return await tx.direccion.update({
            where: { id },
            data: aDatosPrisma(dto),
            include: DIRECCION_INCLUDE,
          });
        } catch (error) {
          throw traducirErrorDePrisma(error);
        }
      },
      id,
    );
  }

  /**
   * DELETE → 204.
   *
   * Se **rechaza** si la dirección tiene servicios. El schema los desengancha
   * con `SetNull`, o sea que el borrado "funcionaría" dejando servicios sin
   * dirección y sin rastro de cuál era. El frontend ya espera este rechazo:
   * busca la palabra "servicio" en el cuerpo del error para mostrar un mensaje
   * entendible (`DirectionTableState.confirm_delete`).
   *
   * Las órdenes no bloquean: su `direccion` es texto libre y el `direccion_id`
   * es un vínculo opcional para reportería.
   */
  async eliminar(id: number): Promise<void> {
    await this.existeOFalla(id);

    const servicios = await this.prisma.servicio.count({ where: { direccion_id: id } });
    if (servicios > 0) {
      throw new ConflictException(
        `No se puede eliminar: la dirección tiene ${servicios} servicio(s) asociado(s).`,
      );
    }

    await this.prisma.direccion.delete({ where: { id } });
  }

  /**
   * **Máximo una dirección principal por cliente.**
   *
   * La base ya lo impone con el índice único parcial `uq_direccion_principal`
   * (`ON direcciones (cliente_id) WHERE principal`), pero ese índice solo sabe
   * rechazar: si el usuario marca como principal una segunda dirección, el
   * error sería un P2002 y el frontend mostraría "ya existe". Lo que el usuario
   * quiso decir es "esta pasa a ser la principal", así que primero se baja la
   * anterior y después se guarda, todo en una transacción para que no quede un
   * instante con dos principales (ni con ninguna, si falla el segundo paso).
   *
   * El índice sigue siendo la red de seguridad ante cualquier escritura que no
   * pase por acá.
   */
  private async enTransaccionConPrincipalUnica(
    clienteId: number,
    principal: boolean | undefined,
    operacion: (tx: Prisma.TransactionClient) => Promise<
      Prisma.DireccionGetPayload<{ include: typeof DIRECCION_INCLUDE }>
    >,
    excluirId?: number,
  ): Promise<Record<string, unknown>> {
    const direccion = await this.prisma.$transaction(async (tx) => {
      if (principal === true) {
        await tx.direccion.updateMany({
          where: {
            cliente_id: clienteId,
            principal: true,
            ...(excluirId !== undefined ? { id: { not: excluirId } } : {}),
          },
          data: { principal: false },
        });
      }

      return operacion(tx);
    });

    return serializarDireccion(direccion);
  }

  private async existeOFalla(id: number): Promise<void> {
    const existe = await this.prisma.direccion.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existe) throw new NotFoundException('No encontrado.');
  }
}

function aDatosPrisma(dto: DireccionWriteDto): Prisma.DireccionUncheckedCreateInput {
  return {
    cliente_id: dto.cliente,
    sector_id: dto.sector ?? null,

    direccion: dto.direccion.trim(),
    activo: dto.activo,
    principal: dto.principal,
    contrato: dto.contrato ?? null,
    sucursal: vacioANull(dto.sucursal),
    coordenadas: vacioANull(dto.coordenadas),
    monto: dto.monto,
  };
}

function vacioANull(valor: string | undefined): string | null | undefined {
  if (valor === undefined) return undefined;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

function traducirErrorDePrisma(error: unknown): unknown {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;

  // FK inexistente: o el cliente o el sector. El constraint que falló viene en
  // el `meta`, así que se puede decir cuál de los dos.
  //
  // Se lee con `nombreDelConstraint()` (Fase 6, `common/errors/prisma-meta.ts`):
  // esto leía `meta.field_name`, que Prisma 6 ya no emite —usa
  // `meta.constraint`—, así que un sector inexistente venía saliendo como
  // "El cliente indicado no existe."
  if (error.code === 'P2003') {
    const campo = nombreDelConstraint(error.meta).includes('sector')
      ? 'sector'
      : 'cliente';
    return new BadRequestException({
      [campo]: [
        campo === 'sector'
          ? 'El sector indicado no existe.'
          : 'El cliente indicado no existe.',
      ],
    });
  }

  // Red de seguridad del índice parcial, por si alguien escribe sin pasar por
  // `enTransaccionConPrincipalUnica`.
  if (error.code === 'P2002') {
    return new BadRequestException({
      principal: ['El cliente ya tiene una dirección principal.'],
    });
  }

  return error;
}
