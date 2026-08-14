import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  FilterEngine,
  mergeCountClauses,
  PaginationParams,
  RawQuery,
  resolveCountFilters,
} from '../common';
import { PrismaService } from '../prisma/prisma.service';
import { sumaDeServiciosActivos } from '../servicios/monto-total';
import { CLIENTE_FILTERS } from './clientes.filters';
import { CLIENTE_INCLUDE, serializarCliente } from './clientes.serializer';
import { ClienteWriteDto } from './dto/cliente.dto';

/**
 * ============================================================================
 * Clientes — Fase 5
 * ----------------------------------------------------------------------------
 * El módulo más grande, y el primero que ejecuta el `FilterEngine` contra la
 * base de verdad (hasta acá solo corría contra fixtures).
 * ============================================================================
 */
@Injectable()
export class ClientesService {
  private readonly engine = new FilterEngine(CLIENTE_FILTERS);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listado paginado. Devuelve la tupla `[count, resultados]`.
   *
   * El orden es `id desc` —el más nuevo primero— y es **obligatorio que haya
   * alguno**: sin `orderBy`, Postgres no garantiza el mismo orden entre dos
   * consultas y la paginación podría repetir u omitir filas al cambiar de
   * página. El frontend no expone ningún control de orden.
   */
  async listar(
    query: RawQuery,
    { skip, take }: PaginationParams,
  ): Promise<[number, Record<string, unknown>[]]> {
    const where = await this.construirWhere(query);

    const [count, filas] = await this.prisma.$transaction([
      this.prisma.cliente.count({ where }),
      this.prisma.cliente.findMany({
        where,
        include: CLIENTE_INCLUDE,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
    ]);

    return [count, filas.map(serializarCliente)];
  }

  /**
   * `GET /api/clientes/all-ids/` — todos los ids que matchean los filtros
   * activos, sin paginar (ROADMAP §3.8).
   *
   * Usa el MISMO `where` que el listado: si divergieran, "seleccionar todo"
   * marcaría clientes que el usuario no está viendo.
   */
  async todosLosIds(query: RawQuery): Promise<number[]> {
    const where = await this.construirWhere(query);

    const filas = await this.prisma.cliente.findMany({
      where,
      select: { id: true },
      orderBy: { id: 'desc' },
    });

    return filas.map((fila) => fila.id);
  }

  async obtener(id: number): Promise<Record<string, unknown>> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: CLIENTE_INCLUDE,
    });

    if (!cliente) throw new NotFoundException('No encontrado.');

    return serializarCliente(cliente);
  }

  async crear(dto: ClienteWriteDto): Promise<Record<string, unknown>> {
    try {
      const cliente = await this.prisma.cliente.create({
        data: aDatosPrisma(dto),
        include: CLIENTE_INCLUDE,
      });
      return serializarCliente(cliente);
    } catch (error) {
      throw traducirErrorDePrisma(error);
    }
  }

  /**
   * PUT. Los campos ausentes NO se resetean: Prisma ignora `undefined`, así
   * que un cliente que mande medio payload solo toca esa mitad. El frontend
   * manda el objeto entero en cada guardado, así que en la práctica es un
   * reemplazo completo.
   *
   * **`monto_total` se recalcula acá** (D6). No sale del payload —el DTO ya no
   * lo declara— sino de la suma de los servicios activos, y viaja en el mismo
   * `update` que el resto de los campos para no hacer dos escrituras sobre la
   * misma fila. Efecto útil: guardar la ficha corrige un `monto_total` que
   * hubiera quedado desincronizado, así que no hace falta un backfill.
   */
  async actualizar(
    id: number,
    dto: ClienteWriteDto,
  ): Promise<Record<string, unknown>> {
    await this.existeOFalla(id);

    try {
      const cliente = await this.prisma.$transaction(async (tx) => {
        const monto_total = await sumaDeServiciosActivos(tx, id);

        return tx.cliente.update({
          where: { id },
          data: { ...aDatosPrisma(dto), monto_total },
          include: CLIENTE_INCLUDE,
        });
      });

      return serializarCliente(cliente);
    } catch (error) {
      throw traducirErrorDePrisma(error);
    }
  }

  /**
   * DELETE → 204. **Es destructivo en cascada**: el schema borra con el cliente
   * sus direcciones y sus servicios (`onDelete: Cascade`), y deja en `null` la
   * referencia en órdenes, pagos y transferencias (`SetNull`), que sobreviven
   * huérfanos.
   *
   * No estaba en el ROADMAP, pero el botón existe en la UI y llama a este
   * endpoint (`ClientDetailState.delete_entity`, `pages/.../client_detail.py`):
   * sin él, el usuario aprieta "Eliminar" y recibe un 404 sin explicación.
   */
  async eliminar(id: number): Promise<void> {
    await this.existeOFalla(id);
    await this.prisma.cliente.delete({ where: { id } });
  }

  /**
   * Filtros → `where` de Prisma. El `countrange` de `cantidad_direcciones` no
   * lo puede resolver el motor solo (Prisma no filtra por `_count`): sale como
   * descriptor y se traduce acá a un `GROUP BY … HAVING` que devuelve ids.
   */
  private async construirWhere(query: RawQuery): Promise<Prisma.ClienteWhereInput> {
    const { where, counts } = this.engine.build(query);
    const extra = await resolveCountFilters(this.prisma, counts);

    return mergeCountClauses(where, extra) as Prisma.ClienteWhereInput;
  }

  /**
   * Sin esto, un `update` o un `delete` sobre un id inexistente sale como el
   * P2025 de Prisma, que el filtro global reporta como 500. Es un 404.
   */
  private async existeOFalla(id: number): Promise<void> {
    const existe = await this.prisma.cliente.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existe) throw new NotFoundException('No encontrado.');
  }
}

/**
 * DTO → `data` de Prisma. Tres traducciones:
 *   - `causa_de_baja` (id plano) → `causa_de_baja_id`,
 *   - fechas `"AAAA-MM-DD"` → `Date`,
 *   - `""` → `null` en los textos opcionales.
 *
 * Los `undefined` se dejan pasar tal cual: Prisma los interpreta como "no
 * tocar este campo".
 *
 * **No incluye `monto_total`** (D6): es derivado. Lo pone `actualizar()` desde
 * `sumaDeServiciosActivos()`, y en el alta lo resuelve el `@default(0)` del
 * schema. `deuda` sí viene del payload — esa no la calcula nadie.
 */
function aDatosPrisma(dto: ClienteWriteDto): Prisma.ClienteUncheckedCreateInput {
  return {
    rut: dto.rut,
    rut_validado: dto.rut_validado,

    nombre1: dto.nombre1,
    nombre2: vacioANull(dto.nombre2),
    nombre3: vacioANull(dto.nombre3),
    apellido1: dto.apellido1,
    apellido2: vacioANull(dto.apellido2),

    email: vacioANull(dto.email),
    tel: vacioANull(dto.tel),

    co_titular1: vacioANull(dto.co_titular1),
    co_titular2: vacioANull(dto.co_titular2),

    activo: dto.activo,
    por_instalar: dto.por_instalar,
    moroso: dto.moroso,
    moroso_desde: aFecha(dto.moroso_desde),

    deuda: dto.deuda,

    krill: dto.krill,
    defontana: dto.defontana,
    zammad: dto.zammad,

    cpes_todos: dto.cpes_todos,
    cpes_inactivos: dto.cpes_inactivos,

    fecha_de_baja: aFecha(dto.fecha_de_baja),
    causa_de_baja_id: dto.causa_de_baja ?? null,

    donacion: dto.donacion,
    analogo: dto.analogo,
    corte_poste: dto.corte_poste,
    baja_por_renuncia: dto.baja_por_renuncia,
    baja_por_morosidad: dto.baja_por_morosidad,
  };
}

/**
 * `""` → `null`. El frontend manda cadena vacía en todos los opcionales que el
 * usuario no completó (`self.cliente.nombre2 or ""`). Guardarla haría que
 * `email = ''` y `email IS NULL` sean dos cosas distintas en la base para el
 * mismo hecho: "no hay correo".
 */
function vacioANull(valor: string | undefined): string | null | undefined {
  if (valor === undefined) return undefined;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

function aFecha(valor: string | null | undefined): Date | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null || valor === '') return null;
  return new Date(valor);
}

/**
 * Errores de Prisma → errores con forma DRF. Sin esto, un RUT repetido sale
 * como 500 y el frontend muestra "Error procesando la solicitud".
 */
function traducirErrorDePrisma(error: unknown): unknown {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;

  // P2002: violación de UNIQUE. `meta.target` trae las columnas.
  if (error.code === 'P2002') {
    const campos = camposDe(error.meta?.target);
    const errores = Object.fromEntries(
      campos.map((campo) => [campo, ['Ya existe un cliente con este valor.']]),
    );
    return new BadRequestException(
      campos.length > 0 ? errores : { detail: 'Ya existe un registro con esos datos.' },
    );
  }

  // P2003: FK inexistente — típicamente una `causa_de_baja` que no está.
  if (error.code === 'P2003') {
    return new BadRequestException({
      causa_de_baja: ['La causa de baja indicada no existe.'],
    });
  }

  return error;
}

function camposDe(target: unknown): string[] {
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === 'string') return [target];
  return [];
}
