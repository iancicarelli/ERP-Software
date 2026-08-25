import { Readable } from 'node:stream';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  csvComoStream,
  FilterEngine,
  lotesOrdenados,
  nombreDelConstraint,
  PaginationParams,
  RawQuery,
} from '../common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdenWriteDto } from './dto/orden.dto';
import { COLUMNAS_CSV_ORDENES } from './ordenes.csv';
import { ORDEN_FILTERS } from './ordenes.filters';
import { MAX_ORDENES_PDF, ORDEN_PDF_INCLUDE, pdfDeOrdenes } from './ordenes.pdf';
import {
  ORDEN_INCLUDE,
  serializarOrdenDetalle,
  serializarOrdenTabla,
} from './ordenes.serializer';

/**
 * ============================================================================
 * Órdenes de trabajo — Fase 7
 * ----------------------------------------------------------------------------
 * La entidad con más campos (~60) y más filtros (52). Dos cosas la separan de
 * clientes y servicios:
 *
 *   1. **Dos serializers** (tabla y detalle), porque las dos vistas piden las
 *      mismas etiquetas con nombres distintos — ver `ordenes.serializer.ts`.
 *   2. **El cliente no llega en el payload** (D9): se resuelve por RUT.
 * ============================================================================
 */
@Injectable()
export class OrdenesService {
  private readonly engine = new FilterEngine(ORDEN_FILTERS);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listado paginado, orden `id desc`. Igual que en las fases anteriores, el
   * `orderBy` es obligatorio: sin él Postgres no garantiza el mismo orden entre
   * consultas y la paginación repetiría u omitiría filas.
   */
  async listar(
    query: RawQuery,
    { skip, take }: PaginationParams,
  ): Promise<[number, Record<string, unknown>[]]> {
    const { where } = this.engine.build(query);

    const [count, filas] = await this.prisma.$transaction([
      this.prisma.ordenTrabajo.count({ where }),
      this.prisma.ordenTrabajo.findMany({
        where,
        include: ORDEN_INCLUDE,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
    ]);

    return [count, filas.map(serializarOrdenTabla)];
  }

  /**
   * `GET /api/ordenes/all-ids/` — usa el MISMO `where` que el listado (§3.8):
   * si divergieran, "seleccionar todo" marcaría órdenes que el usuario no está
   * viendo.
   */
  async todosLosIds(query: RawQuery): Promise<number[]> {
    const { where } = this.engine.build(query);

    const filas = await this.prisma.ordenTrabajo.findMany({
      where,
      select: { id: true },
      orderBy: { id: 'desc' },
    });

    return filas.map((fila) => fila.id);
  }

  /**
   * `exportar_ordenes_csv` — ROADMAP §3.9. Mismo `orderBy` que el listado
   * (`id desc`), así el archivo sale en el orden de la pantalla.
   */
  exportarCsv(ids: number[]): Readable {
    return csvComoStream(
      COLUMNAS_CSV_ORDENES,
      lotesOrdenados(
        async () => {
          const filas = await this.prisma.ordenTrabajo.findMany({
            where: { id: { in: ids } },
            select: { id: true },
            orderBy: { id: 'desc' },
          });
          return filas.map((fila) => fila.id);
        },
        (lote) =>
          this.prisma.ordenTrabajo.findMany({
            where: { id: { in: lote } },
            include: ORDEN_INCLUDE,
            orderBy: { id: 'desc' },
          }),
      ),
    );
  }

  /**
   * `imprimir_orden_de_trabajo` — la ficha en PDF, una orden por página.
   *
   * A diferencia del CSV, acá se trae TODO de una: pdfmake necesita el
   * documento entero antes de emitir el primer byte, así que el streaming por
   * lotes no ahorraría memoria. Por eso también el tope propio
   * (`MAX_ORDENES_PDF`), mucho más bajo que el de la selección.
   *
   * El orden es `id asc` y no `id desc` como el listado: son hojas que se
   * reparten, y lo natural en papel es que la más vieja quede arriba.
   */
  async imprimir(ids: number[]): Promise<Readable> {
    if (ids.length > MAX_ORDENES_PDF) {
      throw new BadRequestException({
        selected_ids: [
          `No se pueden imprimir más de ${MAX_ORDENES_PDF} órdenes por archivo (seleccionaste ${ids.length}).`,
        ],
      });
    }

    const ordenes = await this.prisma.ordenTrabajo.findMany({
      where: { id: { in: ids } },
      include: ORDEN_PDF_INCLUDE,
      orderBy: { id: 'asc' },
    });

    // Un PDF de cero páginas es un archivo corrupto: el visor del usuario diría
    // "no se puede abrir" y nadie sabría por qué. Pasa si las órdenes se
    // borraron entre la selección y el clic.
    if (ordenes.length === 0) {
      throw new BadRequestException({
        detail: 'Ninguna de las órdenes seleccionadas existe.',
      });
    }

    return pdfDeOrdenes(ordenes);
  }

  async obtener(id: number): Promise<Record<string, unknown>> {
    const orden = await this.prisma.ordenTrabajo.findUnique({
      where: { id },
      include: ORDEN_INCLUDE,
    });

    if (!orden) throw new NotFoundException('No encontrado.');

    return serializarOrdenDetalle(orden);
  }

  async crear(dto: OrdenWriteDto): Promise<Record<string, unknown>> {
    const cliente_id = await this.resolverClienteId(dto.rut);

    try {
      const orden = await this.prisma.ordenTrabajo.create({
        data: { ...aDatosPrisma(dto), cliente_id },
        include: ORDEN_INCLUDE,
      });
      return serializarOrdenDetalle(orden);
    } catch (error) {
      throw traducirErrorDePrisma(error);
    }
  }

  /**
   * PUT → 200 con el objeto completo. El `cliente_id` **se vuelve a resolver**:
   * el RUT es un campo editable del formulario, así que si alguien lo corrige,
   * el vínculo tiene que seguirlo. Dejarlo fijo desde el alta haría que la
   * orden quedara colgando del cliente equivocado.
   */
  async actualizar(
    id: number,
    dto: OrdenWriteDto,
  ): Promise<Record<string, unknown>> {
    await this.existeOFalla(id);

    const cliente_id = await this.resolverClienteId(dto.rut);

    try {
      const orden = await this.prisma.ordenTrabajo.update({
        where: { id },
        data: { ...aDatosPrisma(dto), cliente_id },
        include: ORDEN_INCLUDE,
      });
      return serializarOrdenDetalle(orden);
    } catch (error) {
      throw traducirErrorDePrisma(error);
    }
  }

  /**
   * ──────────────────────────────────────────────────────────────────────────
   * D9 — de dónde sale `cliente_id`
   * ──────────────────────────────────────────────────────────────────────────
   * **El frontend nunca manda `cliente`.** Ni el POST ni el PUT tienen esa
   * clave: mandan el RUT como texto, precargado desde la ficha del cliente
   * cuando la orden nace de ahí (`orders_add_state.py:124-132`) y tipeado a
   * mano en cualquier otro caso. Si el backend no resuelve el vínculo, no hay
   * vínculo: `cliente_id` queda `null` para siempre y se pierde poder listar
   * las órdenes de un cliente.
   *
   * Se busca por RUT en **dos formatos** —con y sin puntos— porque no hay
   * garantía de cómo se guardó en `clientes.rut`, y la comparación tiene que
   * poder usar el índice único de esa columna. Un `replace()` en SQL sobre cada
   * fila haría un seq scan de toda la tabla en cada alta de orden.
   *
   * **Un RUT que no matchea no es un error**: `cliente_id` queda en `null` y la
   * orden se guarda igual, con su snapshot intacto. Es el caso de una venta a
   * alguien que todavía no está dado de alta. Si negocio dice que eso es un
   * error de carga, esto pasa a ser un 400 (pregunta 7 del ROADMAP §8).
   */
  private async resolverClienteId(rut: string): Promise<number | null> {
    const candidatos = variantesDeRut(rut);
    if (candidatos.length === 0) return null;

    const cliente = await this.prisma.cliente.findFirst({
      where: { rut: { in: candidatos } },
      select: { id: true },
    });

    return cliente?.id ?? null;
  }

  private async existeOFalla(id: number): Promise<void> {
    const existe = await this.prisma.ordenTrabajo.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existe) throw new NotFoundException('No encontrado.');
  }
}

/**
 * Las formas en que el mismo RUT puede estar escrito en `clientes.rut`:
 * `"16204579-2"` y `"16.204.579-2"`, con el dígito verificador en mayúscula.
 *
 * No se inventan más variantes: alcanza con las dos que produce el frontend
 * (el formulario de cliente acepta las dos) y ambas entran por el índice único.
 */
export function variantesDeRut(rut: string): string[] {
  const limpio = rut.replace(/[.\s]/g, '').toUpperCase().trim();
  if (limpio === '' || limpio === '-') return [];

  const [cuerpo, dv] = limpio.split('-');
  if (!dv || !/^\d+$/.test(cuerpo)) return [limpio];

  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return [limpio, `${conPuntos}-${dv}`];
}

/**
 * DTO → `data` de Prisma. Tres traducciones, las mismas de siempre:
 *   - FKs con nombre plano (`estado`) → `*_id`,
 *   - fechas string → `Date`,
 *   - `""` → `null` en los textos opcionales.
 *
 * `cliente_id` NO sale de acá: lo pone el servicio con `resolverClienteId()`.
 */
function aDatosPrisma(dto: OrdenWriteDto): Prisma.OrdenTrabajoUncheckedCreateInput {
  return {
    // ── Snapshot del cliente ──
    rut: dto.rut.trim(),
    nombre1: dto.nombre1.trim(),
    apellido1: dto.apellido1.trim(),
    apellido2: vacioANull(dto.apellido2),
    email: vacioANull(dto.email),
    tel: vacioANull(dto.tel),

    // ── Kobo ──
    koboid: dto.koboid,
    koboid_serie: dto.koboid_serie,
    kobo_asset_uid: vacioANull(dto.kobo_asset_uid),
    kobo_submission_time: aFecha(dto.kobo_submission_time),

    // ── Contrato / tipo ──
    contrato_nuevo: dto.contrato_nuevo,
    fecha_contrato: aFecha(dto.fecha_contrato),
    modificacion_plan: dto.modificacion_plan,
    migracion: dto.migracion,
    traslado: dto.traslado,

    // ── FKs ──
    servicio_id: dto.servicio ?? null,
    estado_id: dto.estado ?? null,
    causa_id: dto.causa ?? null,
    zona_id: dto.zona ?? null,
    sector_id: dto.sector ?? null,
    vendedor_id: dto.vendedor ?? null,
    tecnico_id: dto.tecnico ?? null,
    tecnico2: vacioANull(dto.tecnico2),

    // ── Equipamiento ──
    anexos_extras: dto.anexos_extras,
    anexos_extras_exterior: dto.anexos_extras_exterior,
    sintonizadores: dto.sintonizadores,
    extensores_wifi: dto.extensores_wifi,

    // ── Costos ──
    metros_extras: dto.metros_extras,
    costo_metros_extras: dto.costo_metros_extras,
    pago_instalacion: dto.pago_instalacion,
    costo_instalacion: dto.costo_instalacion,
    monto: dto.monto,

    // ── Ubicación ──
    direccion: vacioANull(dto.direccion),
    coordenadas: vacioANull(dto.coordenadas),
    medidor_luz: dto.medidor_luz,
    ducto: dto.ducto,
    metros_ducto: dto.metros_ducto,
    poda: dto.poda,
    vecino: dto.vecino,
    postacion: dto.postacion,
    postes: dto.postes,

    // ── Observaciones ──
    observacion_vendedor: vacioANull(dto.observacion_vendedor),
    observacion: vacioANull(dto.observacion),

    // ── Estado ──
    abierto: dto.abierto,
    evaluacion: dto.evaluacion,
    bienvenida: dto.bienvenida,

    // ── Comisión ──
    comision: dto.comision,
    comision_pagada: dto.comision_pagada,
    fecha_pago: aFecha(dto.fecha_pago),

    // ── Agenda ──
    fecha_programado: aFecha(dto.fecha_programado),
    fecha_instalado: aFecha(dto.fecha_instalado),
  };
}

/** `""` → `null`: el frontend manda cadena vacía en todo opcional sin completar. */
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
 * Errores de Prisma → forma DRF. Las 7 FK de la orden pueden fallar, y el
 * frontend muestra el mensaje por campo: decir "no existe" sin decir cuál
 * obligaría al usuario a adivinar entre siete selects.
 */
function traducirErrorDePrisma(error: unknown): unknown {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;

  if (error.code === 'P2003') {
    const constraint = nombreDelConstraint(error.meta);

    // El orden importa: `servicio_id` y `sector_id` no comparten prefijo, pero
    // buscar "causa" antes que "cliente" evita que `causa_id_fkey` caiga en el
    // default.
    const porConstraint: [string, string][] = [
      ['servicio', 'El servicio indicado no existe.'],
      ['estado', 'El estado indicado no existe.'],
      ['causa', 'La causa indicada no existe.'],
      ['vendedor', 'El vendedor indicado no existe.'],
      ['tecnico', 'El técnico indicado no existe.'],
      ['zona', 'La zona indicada no existe.'],
      ['sector', 'El sector indicado no existe.'],
      ['direccion', 'La dirección indicada no existe.'],
      ['cliente', 'El cliente indicado no existe.'],
    ];

    const encontrado = porConstraint.find(([campo]) => constraint.includes(campo));
    if (encontrado) {
      const [campo, mensaje] = encontrado;
      return new BadRequestException({ [campo]: [mensaje] });
    }

    return new BadRequestException({
      detail: 'Alguno de los datos relacionados no existe.',
    });
  }

  return error;
}
