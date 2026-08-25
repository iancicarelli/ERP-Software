import { Readable } from 'node:stream';

/**
 * ============================================================================
 * Generación de CSV — Fase 9
 * ----------------------------------------------------------------------------
 * Las tres exportaciones (`clientes`, `ordenes`, `pagos`) comparten este
 * módulo. Cada entidad solo declara SUS columnas; el escapado, el streaming y
 * las decisiones de formato viven acá una sola vez.
 *
 * ── POR QUÉ PUNTO Y COMA Y NO COMA ──
 * El archivo se abre en Excel, en Chile. Excel no lee el separador del archivo:
 * usa el separador de listas del sistema operativo, que en configuraciones
 * regionales `es-*` es el punto y coma. Con comas, todo el CSV entra en UNA
 * columna y el usuario cree que la exportación salió rota.
 *
 * ── POR QUÉ EL BOM ──
 * Sin `﻿` al principio, Excel interpreta el archivo como Latin-1 y
 * "Concepción" se ve "ConcepciÃ³n". El BOM le dice que es UTF-8. Los parsers
 * serios lo descartan solo.
 *
 * ── POR QUÉ STREAMING ──
 * Lo pide el ROADMAP (§ Fase 9). Con el tope de 10.000 filas del DTO un CSV
 * armado en memoria tampoco explotaría, pero el streaming vuelve el consumo de
 * memoria independiente del tamaño de la selección: el proceso nunca tiene más
 * de un lote en RAM, sin importar cuánto suba ese tope mañana.
 * ============================================================================
 */

/** Excel `es-CL` espera esto; ver cabecera. */
export const SEPARADOR_CSV = ';';

/** RFC 4180: el fin de línea es CRLF, no LF. */
const FIN_DE_LINEA = '\r\n';

/** Marca de UTF-8 para Excel. */
const BOM = '﻿';

export const CSV_CONTENT_TYPE = 'text/csv; charset=utf-8';

/**
 * Una columna del archivo: el encabezado que ve el usuario y cómo sacar el
 * valor de la fila. Se tipa contra la fila de Prisma —no contra el objeto ya
 * serializado— para que el compilador avise si mañana se renombra una columna
 * de la base.
 */
export interface ColumnaCsv<T> {
  encabezado: string;
  valor: (fila: T) => string | number | boolean | null | undefined;
}

/**
 * Escapa un valor según RFC 4180: se entrecomilla si contiene el separador,
 * comillas o saltos de línea, y las comillas internas se duplican.
 *
 * `null` y `undefined` salen como celda vacía, no como el texto "null": en una
 * planilla, vacío ES el dato ausente.
 */
export function celdaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return '';

  const texto = String(valor);
  if (!/[";\r\n,]/.test(texto)) return texto;

  return `"${texto.replace(/"/g, '""')}"`;
}

export function lineaCsv(valores: unknown[]): string {
  return valores.map(celdaCsv).join(SEPARADOR_CSV) + FIN_DE_LINEA;
}

/** `true` → `"Sí"`. Es lo que muestran los chips de la tabla. */
export function siNo(valor: boolean | null | undefined): string {
  return valor ? 'Sí' : 'No';
}

/**
 * Arma el CSV completo como stream a partir de lotes de filas.
 *
 * `lotes` es una función y no un iterable ya construido para que la primera
 * consulta a la base recién salga cuando el stream se empieza a consumir: si
 * Nest aborta la request antes (cliente que se va), no se consultó nada.
 */
export function csvComoStream<T>(
  columnas: ColumnaCsv<T>[],
  lotes: () => AsyncIterable<T[]>,
): Readable {
  async function* generar(): AsyncGenerator<string> {
    yield BOM + lineaCsv(columnas.map((columna) => columna.encabezado));

    for await (const lote of lotes()) {
      // Un `yield` por lote y no por fila: cada `yield` es un chunk del stream,
      // y miles de chunks de 80 bytes son miles de writes al socket.
      yield lote
        .map((fila) => lineaCsv(columnas.map((columna) => columna.valor(fila))))
        .join('');
    }
  }

  return Readable.from(generar());
}

/**
 * Tamaño del lote con el que se leen las filas seleccionadas.
 *
 * 500 es el mismo número que ya usa el frontend para paginar dropdowns. Lo
 * único que importa es que sea bastante menor que `MAX_SELECCION`: con lotes
 * del tamaño de la selección entera, el streaming no ahorraría nada.
 */
export const LOTE_CSV = 500;

/**
 * Parte los ids seleccionados en lotes de `LOTE_CSV`.
 *
 * Se preserva el orden en el que llegaron los ids **dentro** de cada lote, pero
 * el orden final del archivo lo decide el `orderBy` de cada consulta: el
 * frontend manda los ids en el orden en que el usuario los fue tildando, que no
 * es un orden que quiera ver nadie en una planilla.
 */
export function enLotes(ids: number[], tamano = LOTE_CSV): number[][] {
  const lotes: number[][] = [];
  for (let i = 0; i < ids.length; i += tamano) {
    lotes.push(ids.slice(i, i + tamano));
  }
  return lotes;
}

/**
 * Arma los lotes de un export en DOS pasos, y no en uno, por una razón: el
 * orden del archivo.
 *
 * Partir `selected_ids` en tandas y consultar cada tanda con su `orderBy` NO
 * ordena el archivo: cada lote sale ordenado por dentro, pero los lotes entre
 * sí quedan en el orden en que el usuario fue tildando las filas. En pagos,
 * donde la tabla ordena por fecha, el CSV saldría con las fechas salteadas.
 *
 * Entonces:
 *   1. una consulta liviana (`select: {id}`) trae los ids YA ORDENADOS como los
 *      ordena el listado — de paso descarta los ids que no existen;
 *   2. se parte esa secuencia en lotes contiguos y cada lote se trae completo
 *      con el mismo `orderBy`, que reproduce exactamente su tramo.
 *
 * El costo es una consulta extra de solo enteros; a cambio, el archivo sale en
 * el mismo orden que la pantalla.
 */
export function lotesOrdenados<T>(
  idsOrdenados: () => Promise<number[]>,
  traerLote: (ids: number[]) => Promise<T[]>,
  tamano = LOTE_CSV,
): () => AsyncIterable<T[]> {
  return async function* () {
    const ids = await idsOrdenados();

    for (const lote of enLotes(ids, tamano)) {
      yield await traerLote(lote);
    }
  };
}
