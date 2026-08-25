import {
  celdaCsv,
  ColumnaCsv,
  csvComoStream,
  enLotes,
  lineaCsv,
  lotesOrdenados,
  siNo,
} from './csv';

/**
 * ============================================================================
 * CSV — Fase 9
 * ----------------------------------------------------------------------------
 * Lo que se protege acá es lo que rompe un archivo sin que nadie lo note hasta
 * abrirlo en Excel: el escapado, el separador, el BOM y el ORDEN de las filas.
 * ============================================================================
 */

async function textoDe(stream: NodeJS.ReadableStream): Promise<string> {
  const partes: string[] = [];
  for await (const chunk of stream) partes.push(String(chunk));
  return partes.join('');
}

describe('celdaCsv()', () => {
  it('deja pasar el texto simple sin comillas', () => {
    expect(celdaCsv('Concepción')).toBe('Concepción');
  });

  it('entrecomilla si aparece el separador', () => {
    // Sin esto, "Pérez, Juan" se parte en dos columnas y corre TODA la fila.
    expect(celdaCsv('Pérez; Juan')).toBe('"Pérez; Juan"');
  });

  it('entrecomilla también si aparece una coma', () => {
    // El separador es `;`, pero una coma rompería el archivo para cualquier
    // parser que sí use coma. Escapar de más no cuesta nada.
    expect(celdaCsv('Pérez, Juan')).toBe('"Pérez, Juan"');
  });

  it('duplica las comillas internas (RFC 4180)', () => {
    expect(celdaCsv('Le dicen "Chino"')).toBe('"Le dicen ""Chino"""');
  });

  it('entrecomilla el texto con saltos de línea', () => {
    // Las observaciones de una orden tienen enters. Sin comillas, cada enter
    // sería una fila nueva.
    expect(celdaCsv('Primera\nSegunda')).toBe('"Primera\nSegunda"');
  });

  it('emite celda vacía para null y undefined, no el texto "null"', () => {
    expect(celdaCsv(null)).toBe('');
    expect(celdaCsv(undefined)).toBe('');
  });

  it('emite el 0 como 0 y no como vacío', () => {
    // `0` es falsy: un `valor || ''` lo borraría, y un monto de $0 no es lo
    // mismo que un monto que no está.
    expect(celdaCsv(0)).toBe('0');
  });
});

describe('lineaCsv()', () => {
  it('junta con punto y coma y termina en CRLF', () => {
    expect(lineaCsv(['a', 'b'])).toBe('a;b\r\n');
  });
});

describe('siNo()', () => {
  it('traduce el booleano a lo que muestra la tabla', () => {
    expect(siNo(true)).toBe('Sí');
    expect(siNo(false)).toBe('No');
    expect(siNo(null)).toBe('No');
  });
});

describe('enLotes()', () => {
  it('parte respetando el orden recibido', () => {
    expect(enLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('devuelve una lista vacía si no hay ids', () => {
    expect(enLotes([], 2)).toEqual([]);
  });
});

describe('csvComoStream()', () => {
  interface Fila {
    nombre: string;
    monto: number;
  }

  const COLUMNAS: ColumnaCsv<Fila>[] = [
    { encabezado: 'Nombre', valor: (fila) => fila.nombre },
    { encabezado: 'Monto', valor: (fila) => fila.monto },
  ];

  it('empieza con el BOM de UTF-8', async () => {
    // Sin el BOM, Excel abre el archivo como Latin-1 y "Concepción" se ve
    // "ConcepciÃ³n".
    const texto = await textoDe(
      csvComoStream(COLUMNAS, async function* () {
        yield [{ nombre: 'Concepción', monto: 1 }];
      }),
    );

    expect(texto.charCodeAt(0)).toBe(0xfeff);
  });

  it('escribe el encabezado y una línea por fila', async () => {
    const texto = await textoDe(
      csvComoStream(COLUMNAS, async function* () {
        yield [
          { nombre: 'Ana', monto: 1000 },
          { nombre: 'Beto', monto: 2000 },
        ];
      }),
    );

    expect(texto.slice(1)).toBe('Nombre;Monto\r\nAna;1000\r\nBeto;2000\r\n');
  });

  it('emite solo el encabezado si no hay filas', async () => {
    // Un archivo con encabezado y nada más se entiende; uno vacío parece roto.
    const texto = await textoDe(
      csvComoStream(COLUMNAS, async function* () {
        // sin yields
      }),
    );

    expect(texto.slice(1)).toBe('Nombre;Monto\r\n');
  });

  it('no consulta nada hasta que alguien consume el stream', async () => {
    // El generador se pasa como función justamente para esto: una request
    // abortada no tiene que haber tocado la base.
    const espia = jest.fn();
    const stream = csvComoStream(COLUMNAS, async function* () {
      espia();
      yield [];
    });

    expect(espia).not.toHaveBeenCalled();

    await textoDe(stream);
    expect(espia).toHaveBeenCalled();
  });
});

describe('lotesOrdenados()', () => {
  it('trae los lotes en el orden que fijó la consulta de ids', async () => {
    // ESTE es el bug que el helper evita: si se partieran los `selected_ids`
    // tal como llegan, el archivo saldría en el orden en que el usuario fue
    // tildando, no en el de la pantalla.
    const pedidos: number[][] = [];

    const lotes = lotesOrdenados<{ id: number }>(
      // El listado ordena por fecha: los ids salen 30, 10, 20.
      () => Promise.resolve([30, 10, 20]),
      (ids) => {
        pedidos.push(ids);
        return Promise.resolve(ids.map((id) => ({ id })));
      },
      2,
    );

    const filas: { id: number }[] = [];
    for await (const lote of lotes()) filas.push(...lote);

    expect(pedidos).toEqual([[30, 10], [20]]);
    expect(filas.map((fila) => fila.id)).toEqual([30, 10, 20]);
  });
});
