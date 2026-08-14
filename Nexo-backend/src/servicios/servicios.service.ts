import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  FilterEngine,
  nombreDelConstraint,
  PaginationParams,
  RawQuery,
} from '../common';
import { PrismaService } from '../prisma/prisma.service';
import { ServicioWriteDto } from './dto/servicio.dto';
import { recalcularMontoTotal } from './monto-total';
import { SERVICIO_FILTERS } from './servicios.filters';
import { SERVICIO_INCLUDE, serializarServicio } from './servicios.serializer';

/**
 * ============================================================================
 * Servicios — Fase 6
 * ----------------------------------------------------------------------------
 * Los servicios son lo que un cliente tiene contratado: un elemento del
 * catálogo, una cantidad, un monto y la dirección donde está instalado.
 *
 * Tiene dos reglas de negocio que ninguna fase anterior tenía, y las dos tocan
 * plata. Están documentadas en `resolverMonto()` y `recalcularMontoTotal()`.
 * ============================================================================
 */
@Injectable()
export class ServiciosService {
  private readonly engine = new FilterEngine(SERVICIO_FILTERS);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listado paginado. Orden `id desc` —el más nuevo primero—, obligatorio para
   * que la paginación sea estable entre páginas: sin `orderBy`, Postgres no
   * garantiza el mismo orden en dos consultas y se repetirían u omitirían
   * filas. El frontend no expone ningún control de orden.
   */
  async listar(
    query: RawQuery,
    { skip, take }: PaginationParams,
  ): Promise<[number, Record<string, unknown>[]]> {
    const { where } = this.engine.build(query);

    const [count, filas] = await this.prisma.$transaction([
      this.prisma.servicio.count({ where }),
      this.prisma.servicio.findMany({
        where,
        include: SERVICIO_INCLUDE,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
    ]);

    return [count, filas.map(serializarServicio)];
  }

  async obtener(id: number): Promise<Record<string, unknown>> {
    const servicio = await this.prisma.servicio.findUnique({
      where: { id },
      include: SERVICIO_INCLUDE,
    });

    if (!servicio) throw new NotFoundException('No encontrado.');

    return serializarServicio(servicio);
  }

  /** POST → 201. Devuelve el objeto completo; el frontend lo reasigna al DTO. */
  async crear(dto: ServicioWriteDto): Promise<Record<string, unknown>> {
    const monto = await this.resolverMonto(dto);

    try {
      const servicio = await this.prisma.$transaction(async (tx) => {
        const creado = await tx.servicio.create({
          data: aDatosPrisma(dto, monto),
          include: SERVICIO_INCLUDE,
        });

        await recalcularMontoTotal(tx, dto.cliente);
        return creado;
      });

      return serializarServicio(servicio);
    } catch (error) {
      throw traducirErrorDePrisma(error);
    }
  }

  /**
   * PUT → 200.
   *
   * Si el servicio cambió de cliente hay que recalcular **los dos**
   * `monto_total`: el del cliente que lo pierde y el del que lo recibe. El
   * frontend no ofrece mover un servicio entre clientes, pero manda `cliente`
   * en el payload y nada impide que llegue distinto.
   */
  async actualizar(
    id: number,
    dto: ServicioWriteDto,
  ): Promise<Record<string, unknown>> {
    const anterior = await this.prisma.servicio.findUnique({
      where: { id },
      select: { cliente_id: true },
    });

    if (!anterior) throw new NotFoundException('No encontrado.');

    const monto = await this.resolverMonto(dto);

    try {
      const servicio = await this.prisma.$transaction(async (tx) => {
        const actualizado = await tx.servicio.update({
          where: { id },
          data: aDatosPrisma(dto, monto),
          include: SERVICIO_INCLUDE,
        });

        await recalcularMontoTotal(tx, dto.cliente);
        if (anterior.cliente_id !== dto.cliente) {
          await recalcularMontoTotal(tx, anterior.cliente_id);
        }

        return actualizado;
      });

      return serializarServicio(servicio);
    } catch (error) {
      throw traducirErrorDePrisma(error);
    }
  }

  /**
   * DELETE → 204.
   *
   * No estaba en el ROADMAP, igual que el DELETE de clientes de la Fase 5: el
   * botón ya existe en la tabla del detalle de cliente y llama a este endpoint
   * (`ClientTableServiceState.confirm_delete`), con doble click de confirmación.
   * Sin él, el usuario confirma el borrado y recibe un 404 sin explicación.
   *
   * No borra en cascada nada: un servicio es una hoja del grafo.
   */
  async eliminar(id: number): Promise<void> {
    const servicio = await this.prisma.servicio.findUnique({
      where: { id },
      select: { cliente_id: true },
    });

    if (!servicio) throw new NotFoundException('No encontrado.');

    await this.prisma.$transaction(async (tx) => {
      await tx.servicio.delete({ where: { id } });
      await recalcularMontoTotal(tx, servicio.cliente_id);
    });
  }

  /**
   * ──────────────────────────────────────────────────────────────────────────
   * `personalizado` — de dónde sale el monto de un servicio
   * ──────────────────────────────────────────────────────────────────────────
   * La regla que documenta el schema:
   *   · `personalizado = true`  → el monto es MANUAL, vale lo que mandó el
   *     usuario.
   *   · `personalizado = false` → el monto es DERIVADO:
   *     `elementos.monto_base × cantidad`.
   *
   * Está implementada con **una salvedad**, y es importante: si el elemento
   * tiene `monto_base = 0`, se respeta el monto que vino en el payload en vez
   * de calcular 0.
   *
   * Por qué. Hoy los 24 elementos del catálogo tienen `monto_base = 0` — nunca
   * se cargaron los precios reales (ROADMAP, cierre de la Fase 4a). Aplicar la
   * regla al pie de la letra pondría en 0 el monto de TODOS los servicios no
   * personalizados, pisando en silencio lo que el usuario escribió y dejando el
   * módulo inservible hasta que negocio entregue la lista de precios. La
   * salvedad hace que la derivación se active sola, elemento por elemento, a
   * medida que los precios se vayan cargando.
   *
   * ⚠️ Es una decisión de ingeniería para no destruir datos, no una regla
   * confirmada por negocio (ROADMAP Fase 6: "Confirmar con negocio"). Si la
   * respuesta es "un monto_base en 0 significa que el servicio es gratis",
   * borrar el `montoBase > 0` de la condición y listo.
   */
  private async resolverMonto(dto: ServicioWriteDto): Promise<number> {
    const montoManual = dto.monto ?? 0;

    if (dto.personalizado === true) return montoManual;

    const elemento = await this.prisma.elemento.findUnique({
      where: { id: dto.elemento },
      select: { monto_base: true },
    });

    // El elemento inexistente no se rechaza acá: se deja seguir para que lo
    // rechace la FK con un P2003, que `traducirErrorDePrisma` convierte en un
    // 400 con el nombre del campo. Dos validaciones del mismo hecho darían dos
    // mensajes distintos según el orden en que se ejecuten.
    if (!elemento || elemento.monto_base <= 0) return montoManual;

    return elemento.monto_base * (dto.cantidad ?? 1);
  }
}

/**
 * DTO → `data` de Prisma. Las tres FK viajan con el nombre plano
 * (`cliente`, `elemento`, `direccion`) y acá se traducen a `*_id`.
 *
 * `monto` NO sale del DTO: llega ya resuelto por `resolverMonto()`.
 */
function aDatosPrisma(
  dto: ServicioWriteDto,
  monto: number,
): Prisma.ServicioUncheckedCreateInput {
  return {
    cliente_id: dto.cliente,
    elemento_id: dto.elemento,
    // 0 es "sin dirección" en el frontend (`init_new_service`), no un id.
    direccion_id: dto.direccion ? dto.direccion : null,

    activo: dto.activo,
    cantidad: dto.cantidad,
    monto,
    personalizado: dto.personalizado,
  };
}

/**
 * Errores de Prisma → errores con forma DRF. Sin esto, un elemento inexistente
 * sale como 500 y el frontend muestra "Error procesando la solicitud".
 */
function traducirErrorDePrisma(error: unknown): unknown {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;

  // P2003: FK inexistente. El constraint que falló viene en el `meta`, así que
  // se puede decir cuál de las tres.
  if (error.code === 'P2003') {
    const constraint = nombreDelConstraint(error.meta);
    const campo = constraint.includes('elemento')
      ? 'elemento'
      : constraint.includes('direccion')
        ? 'direccion'
        : 'cliente';

    const mensajes: Record<string, string> = {
      elemento: 'El elemento indicado no existe.',
      direccion: 'La dirección indicada no existe.',
      cliente: 'El cliente indicado no existe.',
    };

    return new BadRequestException({ [campo]: [mensajes[campo]] });
  }

  // P2010 / P2011: el CHECK `ck_servicios_cantidad_positiva`. El DTO ya lo
  // ataja con `@Min(1)`; esto es la red por si entra una escritura sin validar.
  if (error.code === 'P2010' || error.code === 'P2011') {
    return new BadRequestException({
      cantidad: ['La cantidad debe ser mayor a cero.'],
    });
  }

  return error;
}
