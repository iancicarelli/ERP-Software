import { FilterEngine } from '../common';
import { TRANSFERENCIA_FILTERS } from './transferencias.filters';

/**
 * ============================================================================
 * El mapa de filtros de transferencias contra el motor real — Fase 8
 * ----------------------------------------------------------------------------
 * FUENTE: `config/transfer/transfer_filter_config.py` y el `get_filters()`
 * propio de `TransferTableState`, que es la única table state del sistema que
 * lo sobrescribe — y por eso lo que viaja por el cable no siempre es lo que el
 * config sugiere. Ver el bloque de `estado`.
 * ============================================================================
 */
describe('TRANSFERENCIA_FILTERS', () => {
  const engine = new FilterEngine(TRANSFERENCIA_FILTERS);
  const clausulas = (query: Record<string, unknown>) =>
    engine.build(query).where.AND as Record<string, unknown>[];

  const PARAMS_DEL_FRONTEND = [
    'search',
    'fecha_after',
    'fecha_before',
    'estado',
    'estado__not',
    'cliente_existe',
    'documento_pagado',
    'cliente_zona',
    'banco_origen',
    'cliente_sector',
    'cliente_rut',
    'id',
  ];

  it('el config del frontend declara 12 params', () => {
    expect(PARAMS_DEL_FRONTEND).toHaveLength(12);
  });

  it('responde a los 12 params del config del frontend', () => {
    const sinEfecto = PARAMS_DEL_FRONTEND.filter((param) => {
      const { where, counts } = engine.build({ [param]: valorDePrueba(param) });
      return Object.keys(where).length === 0 && counts.length === 0;
    });

    expect(sinEfecto).toEqual([]);
  });

  it('no declara filtros que el frontend nunca manda', () => {
    // `fecha` es un `daterange`: se declara por prefijo.
    const sobrantes = Object.keys(TRANSFERENCIA_FILTERS).filter(
      (clave) => !PARAMS_DEL_FRONTEND.includes(clave) && clave !== 'fecha',
    );

    expect(sobrantes).toEqual([]);
  });

  describe('`estado` y `estado__not` — el config miente sobre el tipo', () => {
    it('filtran por el string "Ok", no por un booleano', () => {
      // El config los declara `type: "boolean"`, pero
      // `TransferTableState.get_filters()` los intercepta y manda "Ok". Si el
      // mapa los declarara `boolean`, el engine castearía "Ok" a undefined y
      // los dos filtros quedarían mudos.
      expect(clausulas({ estado: 'Ok' })).toEqual([{ estado: 'Ok' }]);
      expect(clausulas({ estado__not: 'Ok' })).toEqual([
        { estado: { not: 'Ok' } },
      ]);
    });

    it('los dos a la vez se acumulan como cláusulas separadas', () => {
      // `where` siempre tiene forma `{AND: [...]}` justamente para esto: dos
      // filtros sobre la misma columna no se pisan.
      expect(clausulas({ estado: 'Ok', estado__not: 'Rechazada' })).toEqual([
        { estado: 'Ok' },
        { estado: { not: 'Rechazada' } },
      ]);
    });

    it('`estado__not` se declara con la clave literal, sin derivar el sufijo', () => {
      // Derivarlo daría `estado__not__not`. La clave está en el mapa tal cual
      // y apunta a la columna `estado`.
      expect(Object.keys(TRANSFERENCIA_FILTERS)).toContain('estado__not');
    });
  });

  describe('`cliente_existe` — mismo predicado que en pagos', () => {
    it('true → NOT NULL; false → IS NULL', () => {
      expect(clausulas({ cliente_existe: 'true' })).toEqual([
        { cliente_id: { not: null } },
      ]);
      expect(clausulas({ cliente_existe: 'false' })).toEqual([{ cliente_id: null }]);
    });
  });

  describe('`cliente_rut` va contra `rut_transferencia`', () => {
    it('no cruza la relación con el cliente', () => {
      // La transferencia NO tiene columna `cliente_rut`: el RUT que trae es el
      // de quien transfirió (`transfers_table_dto.py:7`). Filtrar por
      // `cliente.rut` dejaría fuera las no conciliadas, que son las que se
      // buscan por RUT en esa pantalla.
      expect(clausulas({ cliente_rut: '19.553' })).toEqual([
        { rut_transferencia: { contains: '19.553', mode: 'insensitive' } },
      ]);
    });
  });

  describe('`search` — incluye el titular del banco', () => {
    it('busca en `nombre` propio y en el nombre del cliente', () => {
      // El `nombre` de la transferencia es el titular que informa el banco:
      // sobre una fila sin conciliar es lo único contra lo que buscar.
      expect(clausulas({ search: 'araneda' })).toEqual([
        {
          OR: [
            { nombre: { contains: 'araneda', mode: 'insensitive' } },
            { cliente: { nombre1: { contains: 'araneda', mode: 'insensitive' } } },
            { cliente: { apellido1: { contains: 'araneda', mode: 'insensitive' } } },
            { cliente: { apellido2: { contains: 'araneda', mode: 'insensitive' } } },
          ],
        },
      ]);
    });
  });

  describe('ubicación — vía la dirección principal (D4)', () => {
    it('`cliente_sector` y `cliente_zona` llevan el scope de principal', () => {
      expect(clausulas({ cliente_sector: 'Boca Sur' })).toEqual([
        {
          cliente: {
            direcciones: {
              some: { principal: true, sector: { sector: 'Boca Sur' } },
            },
          },
        },
      ]);

      expect(clausulas({ cliente_zona: 'Temuco' })).toEqual([
        {
          cliente: {
            direcciones: {
              some: { principal: true, sector: { zona: { zona: 'Temuco' } } },
            },
          },
        },
      ]);
    });
  });

  describe('booleanos y fechas', () => {
    it('`documento_pagado` acepta las formas que manda el frontend', () => {
      expect(clausulas({ documento_pagado: 'true' })).toEqual([
        { documento_pagado: true },
      ]);
      expect(clausulas({ documento_pagado: 'No' })).toEqual([
        { documento_pagado: false },
      ]);
    });

    it('`fecha_before` es exclusivo, igual que en pagos', () => {
      expect(
        clausulas({ fecha_after: '2026-08-01', fecha_before: '2026-08-15' }),
      ).toEqual([
        { fecha: { gte: new Date('2026-08-01') } },
        { fecha: { lt: new Date('2026-08-15') } },
      ]);
    });
  });
});

function valorDePrueba(param: string): string {
  if (param.endsWith('_after') || param.endsWith('_before')) return '2026-01-01';
  if (param === 'cliente_existe' || param === 'documento_pagado') return 'true';
  if (param === 'id') return '1';
  return 'texto';
}
