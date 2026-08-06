import { PaginationParams } from '../common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ============================================================================
 * Los 9 catálogos, declarados en un solo lugar — Fase 4a
 * ----------------------------------------------------------------------------
 * Nueve endpoints que hacen exactamente lo mismo (contar, paginar, ordenar
 * alfabéticamente y aplanar a `{id, etiqueta}`) no son nueve controladores:
 * son nueve DATOS. Lo único que cambia entre ellos es la ruta, la tabla y qué
 * campos salen. `crearControladorCatalogo()` los convierte en controladores de
 * Nest.
 *
 * Las claves de cada `serializar` NO son negociables: el frontend las lee
 * literales (`item.get("sector")`, `item.get("zona_str")`, …). Cada una está
 * anotada con quién la consume.
 *
 * D3 (§2): `/sectores/` y `/zonas/` son ÚNICAS y sirven a los cuatro módulos.
 * Las rutas `/sectores-ordenes/` y `/zonas-ordenes/` que hoy pide el frontend
 * no existen en el backend a propósito — la Fase 4b lo adapta.
 * ============================================================================
 */

export interface CatalogoDefinicion<T> {
  /** Ruta bajo `/api/`, sin barras. */
  ruta: string;
  /** Para qué sirve y quién la consume. Sale en el log de arranque. */
  descripcion: string;
  /** Cuenta y trae una página. Devuelve la tupla de `$transaction`. */
  consultar(prisma: PrismaService, pagina: PaginationParams): Promise<[number, T[]]>;
  /** Fila de la BD → objeto JSON tal como lo espera el frontend. */
  serializar(fila: T): Record<string, unknown>;
}

/** Solo fija `T` a partir del `consultar`, para no anotarlo a mano en cada uno. */
function definir<T>(def: CatalogoDefinicion<T>): CatalogoDefinicion<unknown> {
  return def as CatalogoDefinicion<unknown>;
}

export const CATALOGOS: ReadonlyArray<CatalogoDefinicion<unknown>> = [
  // ── Geografía (unificada por D3) ─────────────────────────────────────────
  definir({
    ruta: 'zonas',
    descripcion: 'Zonas — filtros y dropdowns de clientes, pagos, transferencias y órdenes',
    consultar: (prisma, { skip, take }) =>
      prisma.$transaction([
        prisma.zona.count(),
        prisma.zona.findMany({ orderBy: { zona: 'asc' }, skip, take }),
      ]),
    // `zona` lo leen FilterState._fetch_options y los tres *DropdownState.
    serializar: (fila) => ({ id: fila.id, zona: fila.zona }),
  }),

  definir({
    ruta: 'sectores',
    descripcion: 'Sectores — idem zonas, más el filtrado sector→zona de los formularios',
    consultar: (prisma, { skip, take }) =>
      prisma.$transaction([
        prisma.sector.count(),
        prisma.sector.findMany({
          include: { zona: true },
          orderBy: { sector: 'asc' },
          skip,
          take,
        }),
      ]),
    serializar: (fila) => ({
      id: fila.id,
      sector: fila.sector,
      // `zona` es el ID, no el nombre: `filter_sectores_by_zona_id()` compara
      // `item.get("zona") == zona_id` para filtrar los sectores de una zona.
      zona: fila.zona_id,
      // `zona_str` es la etiqueta: `DropdownState.load_sectores()` arma
      // "Centro Castro (Castro)" con las dos.
      zona_str: fila.zona.zona,
    }),
  }),

  // ── Catálogos de cliente / servicio ──────────────────────────────────────
  definir({
    ruta: 'elementos',
    descripcion: 'Planes y productos instalables — dropdown de servicios',
    consultar: (prisma, { skip, take }) =>
      prisma.$transaction([
        prisma.elemento.count(),
        prisma.elemento.findMany({ orderBy: { elemento: 'asc' }, skip, take }),
      ]),
    serializar: (fila) => ({
      id: fila.id,
      elemento: fila.elemento,
      // Ninguno de los dos los lee el frontend hoy. `monto_base` lo necesita la
      // Fase 6 (monto del servicio no personalizado) y `activo` está para que
      // el día que haya que ocultar un plan viejo no haya que tocar el contrato.
      monto_base: fila.monto_base,
      activo: fila.activo,
    }),
  }),

  definir({
    ruta: 'causadebajas',
    descripcion: 'Causas de baja de cliente — dropdown del detalle de cliente',
    consultar: (prisma, { skip, take }) =>
      prisma.$transaction([
        prisma.causaBaja.count(),
        prisma.causaBaja.findMany({ orderBy: { causa: 'asc' }, skip, take }),
      ]),
    serializar: (fila) => ({ id: fila.id, causa: fila.causa }),
  }),

  // ── Catálogos de orden de trabajo ────────────────────────────────────────
  definir({
    ruta: 'servicios-ordenes',
    descripcion: 'Servicios del formulario de orden — NO es la tabla `servicios`',
    consultar: (prisma, { skip, take }) =>
      prisma.$transaction([
        prisma.servicioOrden.count(),
        prisma.servicioOrden.findMany({ orderBy: { servicio: 'asc' }, skip, take }),
      ]),
    serializar: (fila) => ({ id: fila.id, servicio: fila.servicio }),
  }),

  definir({
    ruta: 'estados-ordenes',
    descripcion: 'Estados de orden — dropdown y filtro `estado_estado`',
    consultar: (prisma, { skip, take }) =>
      prisma.$transaction([
        prisma.estadoOrden.count(),
        prisma.estadoOrden.findMany({ orderBy: { estado: 'asc' }, skip, take }),
      ]),
    serializar: (fila) => ({ id: fila.id, estado: fila.estado }),
  }),

  definir({
    ruta: 'causas-ordenes',
    descripcion: 'Causas de orden (por qué no se instaló) — dropdown del detalle',
    consultar: (prisma, { skip, take }) =>
      prisma.$transaction([
        prisma.causaOrden.count(),
        prisma.causaOrden.findMany({ orderBy: { causa: 'asc' }, skip, take }),
      ]),
    serializar: (fila) => ({ id: fila.id, causa: fila.causa }),
  }),

  definir({
    ruta: 'tecnicos-ordenes',
    descripcion: 'Técnicos — dropdown de asignación de la orden',
    consultar: (prisma, { skip, take }) =>
      prisma.$transaction([
        prisma.tecnico.count(),
        prisma.tecnico.findMany({
          orderBy: [{ apellido1: 'asc' }, { nombre1: 'asc' }],
          skip,
          take,
        }),
      ]),
    // El frontend arma la etiqueta con `f"{nombre1} {apellido1} {apellido2}"`,
    // así que los tres campos van por separado y `apellido2` puede ser null.
    serializar: (fila) => ({
      id: fila.id,
      nombre1: fila.nombre1,
      apellido1: fila.apellido1,
      apellido2: fila.apellido2,
      activo: fila.activo,
    }),
  }),

  definir({
    ruta: 'vendedores-ordenes',
    descripcion: 'Vendedores — dropdown de asignación de la orden',
    consultar: (prisma, { skip, take }) =>
      prisma.$transaction([
        prisma.vendedor.count(),
        prisma.vendedor.findMany({
          orderBy: [{ apellido1: 'asc' }, { nombre1: 'asc' }],
          skip,
          take,
        }),
      ]),
    serializar: (fila) => ({
      id: fila.id,
      nombre1: fila.nombre1,
      apellido1: fila.apellido1,
      apellido2: fila.apellido2,
      activo: fila.activo,
    }),
  }),
];
