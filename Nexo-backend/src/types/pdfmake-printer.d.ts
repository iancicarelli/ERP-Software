/**
 * ============================================================================
 * Tipos de `pdfmake` del lado del servidor — Fase 9
 * ----------------------------------------------------------------------------
 * `@types/pdfmake` describe la API del **navegador** (`createPdf()`), pero el
 * `main` del paquete en Node es `src/printer.js`, que exporta otra cosa: la
 * clase `PdfPrinter`. Importarla con esos tipos da "This expression is not
 * constructable".
 *
 * Se declara acá la superficie que realmente se usa —constructor y
 * `createPdfKitDocument()`— y se sigue tomando de `@types/pdfmake` todo lo
 * demás (`TDocumentDefinitions`, `Content`…), que sí es correcto y es la parte
 * grande.
 *
 * El documento que devuelve pdfkit es un `Readable` al que hay que llamarle
 * `end()` para que empiece a escribir.
 * ============================================================================
 */
declare module 'pdfmake/src/printer' {
  import type { Readable } from 'node:stream';

  import type {
    CustomTableLayout,
    TDocumentDefinitions,
    TFontDictionary,
  } from 'pdfmake/interfaces';

  class PdfPrinter {
    constructor(fuentes: TFontDictionary);

    createPdfKitDocument(
      definicion: TDocumentDefinitions,
      opciones?: { tableLayouts?: Record<string, CustomTableLayout> },
    ): Readable & { end(): void };
  }

  export = PdfPrinter;
}
