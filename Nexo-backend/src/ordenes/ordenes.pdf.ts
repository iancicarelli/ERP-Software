import { Readable } from 'node:stream';

import { Prisma } from '@prisma/client';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
// `pdfmake/src/printer` y no `pdfmake`: ver `src/types/pdfmake-printer.d.ts`.
import PdfPrinter from 'pdfmake/src/printer';

import { fechaHora, soloFecha } from '../common';
import { nombreDePersona } from './ordenes.serializer';

/**
 * ============================================================================
 * `imprimir_orden_de_trabajo` — la ficha en PDF — Fase 9
 * ----------------------------------------------------------------------------
 * El documento que el técnico se lleva a terreno. Reproduce la ficha de
 * `/order/detail` con sus cinco secciones y sus mismas etiquetas
 * (`config/order/order_detail_config.py`), más las notas y un pie de firmas —
 * las dos cosas que solo tienen sentido en papel.
 *
 * ── POR QUÉ pdfmake Y NO PUPPETEER ──
 * Puppeteer permitiría maquetar la ficha en HTML y "imprimirla", con más
 * fidelidad visual. El precio es Chromium adentro de la imagen: +300 MB, un
 * arranque de headless por cada PDF y una lista conocida de dolores en Docker
 * (sandbox, fuentes, zombies). pdfmake es JS puro, pesa ~2 MB y no agrega
 * ningún binario.
 *
 * ── POR QUÉ HELVETICA Y NO ROBOTO ──
 * pdfmake normalmente embebe fuentes TTF. Acá se usan las **fuentes estándar
 * del formato PDF** (Helvetica y sus variantes), que todo visor tiene por
 * definición: no hay archivos de fuente que copiar a la imagen ni un vfs que
 * mantener. Cubren Latin-1, o sea tildes y ñ — que es todo lo que necesita una
 * orden de trabajo en Chile.
 * ============================================================================
 */

/**
 * Tope de órdenes por PDF, bastante más bajo que `MAX_SELECCION`.
 *
 * A diferencia del CSV, el PDF **no se puede streamear por lotes**: pdfmake
 * necesita el documento entero armado en memoria antes de emitir el primer
 * byte. 10.000 órdenes serían 10.000 páginas y un pico de memoria capaz de
 * tumbar el contenedor.
 *
 * 100 es holgado para el uso real —imprimir la agenda de un técnico para el
 * día son una o dos decenas— y el frontend da 60s de timeout para esa acción,
 * que alcanza de sobra para esa cantidad.
 */
export const MAX_ORDENES_PDF = 100;

/** Lo que el PDF necesita de cada orden: las relaciones de la ficha + notas. */
export const ORDEN_PDF_INCLUDE = {
  estado: true,
  causa: true,
  servicio: true,
  vendedor: true,
  tecnico: true,
  zona: true,
  sector: true,
  notas: {
    include: { added_by: { select: { username: true } } },
    orderBy: { fecha_creacion: 'asc' },
  },
} satisfies Prisma.OrdenTrabajoInclude;

export type OrdenParaPdf = Prisma.OrdenTrabajoGetPayload<{
  include: typeof ORDEN_PDF_INCLUDE;
}>;

const FUENTES = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const GRIS = '#666666';
const LINEA = '#cccccc';

/**
 * Arma el PDF con una orden por página y lo devuelve como stream.
 *
 * El documento de pdfkit YA es un `Readable`, así que no hace falta juntar los
 * chunks en un Buffer: se le pasa directo a `StreamableFile` y los bytes salen
 * hacia el cliente a medida que se generan.
 */
export function pdfDeOrdenes(ordenes: OrdenParaPdf[]): Readable {
  const printer = new PdfPrinter(FUENTES);
  const documento = printer.createPdfKitDocument(definicion(ordenes));

  // `end()` dispara la escritura. Sin esto el stream nunca termina y la
  // descarga queda colgada para siempre.
  documento.end();

  return documento;
}

function definicion(ordenes: OrdenParaPdf[]): TDocumentDefinitions {
  return {
    // Carta y no A4: es el tamaño de papel que se usa en Chile.
    pageSize: 'LETTER',
    pageMargins: [36, 40, 36, 44],
    // Interlineado justo: con `unbreakable` en cada sección, unos pocos puntos
    // de más empujan una sección entera a la hoja siguiente. Una orden típica
    // entra en una sola hoja con estos valores.
    defaultStyle: { font: 'Helvetica', fontSize: 9, lineHeight: 1.1 },

    content: ordenes.map((orden, indice) => paginaDeOrden(orden, indice > 0)),

    footer: (paginaActual: number, totalPaginas: number) => ({
      columns: [
        { text: 'Nexo ERP', fontSize: 7, color: GRIS },
        {
          text: `Página ${paginaActual} de ${totalPaginas}`,
          fontSize: 7,
          color: GRIS,
          alignment: 'right',
        },
      ],
      margin: [36, 12, 36, 0],
    }),

    styles: {
      titulo: { fontSize: 16, bold: true },
      seccion: { fontSize: 10, bold: true, margin: [0, 9, 0, 3] },
      etiqueta: { fontSize: 8, color: GRIS },
      valor: { fontSize: 9 },
    },
  };
}

function paginaDeOrden(orden: OrdenParaPdf, saltoDePagina: boolean): Content {
  const cliente = [orden.nombre1, orden.apellido1, orden.apellido2]
    .filter((parte) => parte && parte.trim() !== '')
    .join(' ');

  return {
    // Una orden por página: quien imprime 20 órdenes quiere 20 hojas
    // repartibles, no un documento corrido.
    ...(saltoDePagina ? { pageBreak: 'before' as const } : {}),
    stack: [
      encabezado(orden, cliente),

      // Las cinco secciones de `/order/detail`, con sus mismas etiquetas.
      seccion('INFORMACIÓN DE KOBOTOOLBOX', [
        ['Kobo ID', orden.koboid],
        ['Kobo Serie', orden.koboid_serie],
        ['Kobo UID', orden.kobo_asset_uid],
        ['Fecha de Ingreso (Kobo)', fechaHoraLegible(orden.kobo_submission_time)],
      ]),

      seccion('INFORMACIÓN ADMINISTRATIVA', [
        ['Vendedor', nombreDePersona(orden.vendedor)],
        ['Contrato Nuevo', siNoPdf(orden.contrato_nuevo)],
        ['Fecha Contrato', soloFecha(orden.fecha_contrato)],
        ['Zona', orden.zona?.zona],
        ['Sector', orden.sector?.sector],
        ['RUT Cliente', orden.rut],
        ['Nombre', orden.nombre1],
        ['Apellido Paterno', orden.apellido1],
        ['Apellido Materno', orden.apellido2],
        ['Email', orden.email],
        ['Teléfono', orden.tel],
        ['Dirección', orden.direccion],
      ]),

      seccion('INFORMACIÓN DE SERVICIO', [
        ['Modificación de Plan', siNoPdf(orden.modificacion_plan)],
        ['Migración', siNoPdf(orden.migracion)],
        ['Traslado', siNoPdf(orden.traslado)],
        ['Servicio', orden.servicio?.servicio],
        ['Anexos extras interior', orden.anexos_extras],
        ['Anexos extras exterior', orden.anexos_extras_exterior],
        ['Sintonizadores', orden.sintonizadores],
        ['Extensores Wifi', orden.extensores_wifi],
      ]),

      seccion('INFORMACIÓN DE FACTIBILIDAD', [
        ['Metros Extras', orden.metros_extras],
        // No está en el formulario, pero en una ficha impresa el metraje sin su
        // costo obliga a volver al sistema justo cuando no hay sistema.
        ['Costo Metros Extras', pesos(orden.costo_metros_extras)],
        ['Coordenadas', orden.coordenadas],
        ['Medidor de Luz', siNoPdf(orden.medidor_luz)],
        ['Ducto', siNoPdf(orden.ducto)],
        ['Metros de Ducto', orden.metros_ducto],
        ['Poda', siNoPdf(orden.poda)],
        ['Permiso Vecino', siNoPdf(orden.vecino)],
        ['Postación', siNoPdf(orden.postacion)],
        ['Cantidad de Postes', orden.postes],
      ]),

      seccion('INFORMACIÓN DE GESTIÓN', [
        ['Estado', orden.estado?.estado.replace(/_/g, ' ')],
        ['Causa', orden.causa?.causa],
        ['Aplica Comisión', siNoPdf(orden.comision)],
        ['Comisión Pagada', siNoPdf(orden.comision_pagada)],
        ['Costo Instalación', pesos(orden.costo_instalacion)],
        // Tampoco están en el formulario; ver la nota de Costo Metros Extras.
        ['Pago Instalación', orden.pago_instalacion ? 'Pagado' : 'Pendiente'],
        ['Monto', pesos(orden.monto)],
        ['Fecha Pago', soloFecha(orden.fecha_pago)],
        ['Fecha Programada', fechaHoraLegible(orden.fecha_programado)],
        ['Fecha Instalación', fechaHoraLegible(orden.fecha_instalado)],
        ['Técnico Principal', nombreDePersona(orden.tecnico)],
        ['Técnico 2', orden.tecnico2],
        ['Abierto', siNoPdf(orden.abierto)],
        ['Evaluación', siNoPdf(orden.evaluacion)],
        ['Bienvenida', siNoPdf(orden.bienvenida)],
      ]),

      textoLargo('Observación Vendedor', orden.observacion_vendedor),
      textoLargo('Observación', orden.observacion),

      notas(orden),
      firmas(),
    ],
  };
}

function encabezado(orden: OrdenParaPdf, cliente: string): Content {
  return {
    stack: [
      {
        columns: [
          { text: `ORDEN DE TRABAJO N° ${orden.id}`, style: 'titulo' },
          {
            // Fecha de impresión, no de la orden: sirve para saber si la hoja
            // que alguien tiene en la mano está vieja.
            text: `Emitida el ${soloFecha(new Date())}`,
            style: 'etiqueta',
            alignment: 'right',
            margin: [0, 6, 0, 0],
          },
        ],
      },
      {
        text: `${cliente}   ·   ${orden.rut}`,
        fontSize: 11,
        margin: [0, 2, 0, 0],
      },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 4, x2: 523, y2: 4, lineWidth: 1, lineColor: LINEA },
        ],
      },
    ],
  };
}

/**
 * Columnas por sección. El formulario en pantalla usa dos (`columns="2"`), pero
 * el papel no es la pantalla: con dos, la ficha se va a una segunda hoja por
 * media sección y quien imprime la agenda de un técnico se lleva el doble de
 * papel. Con tres entra completa en una hoja, y a 8pt las etiquetas más largas
 * ("Fecha de Ingreso (Kobo)") siguen entrando en su columna.
 */
const COLUMNAS_POR_SECCION = 3;

/**
 * Una sección con sus campos en grilla.
 *
 * La tabla va sin bordes y con la etiqueta chica arriba del valor: es más
 * legible en papel que una grilla con líneas, y a la vez ocupa menos alto, que
 * es lo que decide si la ficha entra en una hoja.
 */
function seccion(titulo: string, campos: [string, unknown][]): Content {
  const celdas = campos.map(([etiqueta, valor]) => campo(etiqueta, valor));

  // Se completa la última fila para que la tabla no quede coja: pdfmake exige
  // que todas las filas tengan la misma cantidad de columnas.
  while (celdas.length % COLUMNAS_POR_SECCION !== 0) celdas.push({ text: '' });

  const filas: Content[][] = [];
  for (let i = 0; i < celdas.length; i += COLUMNAS_POR_SECCION) {
    filas.push(celdas.slice(i, i + COLUMNAS_POR_SECCION));
  }

  return {
    stack: [
      { text: titulo, style: 'seccion' },
      {
        table: {
          widths: Array<string>(COLUMNAS_POR_SECCION).fill('*'),
          body: filas,
        },
        layout: 'noBorders',
      },
    ],
    // Una sección no se parte entre dos hojas: media lista de campos al pie de
    // una página y la otra media arriba de la siguiente se lee pésimo.
    unbreakable: true,
  };
}

function campo(etiqueta: string, valor: unknown): Content {
  return {
    stack: [
      { text: etiqueta, style: 'etiqueta' },
      // Guion y no vacío: en papel, un renglón en blanco no distingue "no hay
      // dato" de "se olvidaron de imprimirlo".
      { text: textoDe(valor), style: 'valor' },
    ],
    margin: [0, 0, 0, 4],
  };
}

/** Observaciones: texto libre, ancho completo, solo si hay algo escrito. */
function textoLargo(titulo: string, texto: string | null): Content {
  if (!texto || texto.trim() === '') return { text: '' };

  return {
    stack: [
      { text: titulo, style: 'seccion' },
      { text: texto, style: 'valor' },
    ],
  };
}

/**
 * Las notas de la orden. No están en la tabla ni en el CSV —son un hilo de
 * conversación, no una columna— pero en la ficha impresa son justo lo que
 * explica por qué la orden está como está.
 */
function notas(orden: OrdenParaPdf): Content {
  if (orden.notas.length === 0) return { text: '' };

  return {
    stack: [
      { text: 'NOTAS', style: 'seccion' },
      ...orden.notas.map((nota) => ({
        columns: [
          {
            width: 110,
            text: `${fechaHoraLegible(nota.fecha_creacion) ?? ''}\n${nota.added_by?.username ?? ''}`,
            style: 'etiqueta',
          },
          { text: nota.nota, style: 'valor' },
        ],
        margin: [0, 0, 0, 4] as [number, number, number, number],
        // Sin esto, una nota al pie de la hoja deja la fecha en una página y el
        // autor en la siguiente.
        unbreakable: true,
      })),
    ],
  };
}

/** Pie para firmar en terreno. Solo tiene sentido en el papel. */
function firmas(): Content {
  const linea = (rotulo: string): Content => ({
    stack: [
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#000000' },
        ],
      },
      { text: rotulo, style: 'etiqueta', margin: [0, 4, 0, 0] },
    ],
  });

  return {
    columns: [linea('Firma del técnico'), linea('Firma del cliente')],
    // Aire suficiente para separarlo del contenido, pero no tanto como para
    // que el bloque —que es indivisible— se caiga solo a una hoja nueva.
    margin: [0, 16, 0, 0],
    unbreakable: true,
  };
}

function textoDe(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  return String(valor);
}

function siNoPdf(valor: boolean): string {
  return valor ? 'Sí' : 'No';
}

/**
 * `"2026-08-28T14:30"` → `"2026-08-28 14:30"`.
 *
 * La `T` del ISO existe para que una máquina parsee el string sin ambigüedad.
 * Acá el lector es una persona con la hoja en la mano, y la `T` pegada entre la
 * fecha y la hora se lee como un error de impresión.
 */
function fechaHoraLegible(fecha: Date | null): string | null {
  return fechaHora(fecha)?.replace('T', ' ') ?? null;
}

/** `12000` → `"$12.000"`. Acá sí se formatea: nadie suma una hoja impresa. */
function pesos(monto: number): string {
  return `$${monto.toLocaleString('es-CL')}`;
}
