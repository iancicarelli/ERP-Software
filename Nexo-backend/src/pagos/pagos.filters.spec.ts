import { FilterEngine } from '../common';
import { PAGO_FILTERS } from './pagos.filters';

/**
 * ============================================================================
 * El mapa de filtros de pagos contra el motor real — Fase 8
 * ----------------------------------------------------------------------------
 * Mismo criterio que clientes y órdenes: primero se verifica que cada param que
 * el frontend puede mandar tenga con qué responder de este lado, y que no sobre
 * ninguno. Un filtro que el usuario activa y el backend ignora **no da error**:
 * devuelve resultados de más, en silencio, y el usuario cree que está viendo un
 * subconjunto filtrado.
 *
 * Acá eso importa más que en las otras entidades, porque cinco de los params
 * van en camelCase: una sola letra mal en `fiscalYear` no rompe nada visible.
 * ============================================================================
 */
describe('PAGO_FILTERS', () => {
  const engine = new FilterEngine(PAGO_FILTERS);
  const clausulas = (query: Record<string, unknown>) =>
    engine.build(query).where.AND as Record<string, unknown>[];

  /**
   * Los params de `PAYMENT_FILTER_CONFIG`, transcritos del frontend, más los
   * dos que el config no declara y el dashboard sí manda (`entryDate_after` /
   * `entryDate_before` salen del config; `cliente_existe` lo mandan los dos).
   */
  const PARAMS_DEL_FRONTEND = [
    'search',
    'entryDate_after',
    'entryDate_before',
    'cliente_sector',
    'cliente_zona',
    'fiscalYear',
    'voucherType',
    'documentType',
    'cliente_existe',
    'entryUser',
    'cliente_rut',
    'id',
  ];

  it('el config del frontend declara 12 params', () => {
    // Si este número cambia, alguien tocó `payment_filter_config.py` y hay que
    // revisar el mapa.
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
    // `entryDate` es un `daterange`: se declara por prefijo, no por param.
    const sobrantes = Object.keys(PAGO_FILTERS).filter(
      (clave) => !PARAMS_DEL_FRONTEND.includes(clave) && clave !== 'entryDate',
    );

    expect(sobrantes).toEqual([]);
  });

  describe('camelCase — la excepción a D2', () => {
    it('los cinco params camelCase apuntan a columnas snake_case', () => {
      expect(clausulas({ fiscalYear: '2026' })).toEqual([{ fiscal_year: 2026 }]);
      expect(clausulas({ voucherType: 'INGRESO' })).toEqual([
        { voucher_type: 'INGRESO' },
      ]);
      expect(clausulas({ documentType: 'BOLETA' })).toEqual([
        { document_type: 'BOLETA' },
      ]);
      expect(clausulas({ entryUser: 'ADMIN' })).toEqual([{ entry_user: 'ADMIN' }]);
      expect(clausulas({ entryDate_after: '2026-01-01' })).toEqual([
        { entry_date: { gte: new Date('2026-01-01') } },
      ]);
    });

    it('`fiscalYear` castea a entero: la columna es SmallInt, el select manda texto', () => {
      expect(clausulas({ fiscalYear: '2026' })).toEqual([{ fiscal_year: 2026 }]);
      // Un año no numérico se descarta en silencio en vez de reventar la query.
      expect(engine.build({ fiscalYear: 'dos mil' }).where).toEqual({});
    });

    // El equivalente en snake_case NO existe: si alguien lo manda por
    // costumbre, el filtro no aplica. Es el precio de seguir al frontend.
    it('no responde a la versión snake_case de esos params', () => {
      expect(engine.build({ fiscal_year: '2026' }).where).toEqual({});
      expect(engine.build({ entry_user: 'ADMIN' }).where).toEqual({});
    });
  });

  describe('rango de fechas del dashboard', () => {
    it('`_before` es EXCLUSIVO: contar "hoy" manda mañana como tope', () => {
      // `index_payment_state.py` cuenta los pagos de hoy con
      // after=hoy & before=mañana. Con un `lte` se comería mañana entero.
      expect(
        clausulas({ entryDate_after: '2026-08-14', entryDate_before: '2026-08-15' }),
      ).toEqual([
        { entry_date: { gte: new Date('2026-08-14') } },
        { entry_date: { lt: new Date('2026-08-15') } },
      ]);
    });
  });

  describe('`cliente_existe` — calculado, no columna', () => {
    it('true → cliente_id NOT NULL; false → cliente_id IS NULL', () => {
      expect(clausulas({ cliente_existe: 'true' })).toEqual([
        { cliente_id: { not: null } },
      ]);
      expect(clausulas({ cliente_existe: 'false' })).toEqual([{ cliente_id: null }]);
    });

    it('acepta el "Si"/"No" del select además del true/false del dashboard', () => {
      // `_normalize_value()` del frontend manda booleanos, pero el select
      // crudo y el dashboard mandan strings distintos. Los tres tienen que
      // llegar al mismo where.
      expect(clausulas({ cliente_existe: 'Si' })).toEqual([
        { cliente_id: { not: null } },
      ]);
      expect(clausulas({ cliente_existe: 'No' })).toEqual([{ cliente_id: null }]);
      expect(clausulas({ cliente_existe: true })).toEqual([
        { cliente_id: { not: null } },
      ]);
    });

    it('un valor que no es booleano no aplica ningún filtro', () => {
      expect(engine.build({ cliente_existe: 'quizás' }).where).toEqual({});
    });
  });

  describe('el snapshot manda, igual que en órdenes (D9)', () => {
    it('`cliente_rut` va contra la columna del pago, no contra `cliente.rut`', () => {
      // Un pago sin conciliar tiene `cliente_id` en null: filtrar por la
      // relación lo dejaría invisible justo cuando se lo busca por RUT.
      expect(clausulas({ cliente_rut: '16.204' })).toEqual([
        { cliente_rut: { contains: '16.204', mode: 'insensitive' } },
      ]);
    });

    it('`search` sí cruza la relación: el pago no tiene columnas de nombre', () => {
      expect(clausulas({ search: 'fuentes' })).toEqual([
        {
          OR: [
            { cliente: { nombre1: { contains: 'fuentes', mode: 'insensitive' } } },
            { cliente: { apellido1: { contains: 'fuentes', mode: 'insensitive' } } },
            { cliente: { apellido2: { contains: 'fuentes', mode: 'insensitive' } } },
          ],
        },
      ]);
    });
  });

  describe('ubicación — vía la dirección principal del cliente (D4)', () => {
    it('`cliente_sector` acota el `some` con el scope de dirección principal', () => {
      // Sin el scope, un pago matchearía por CUALQUIER dirección del cliente.
      expect(clausulas({ cliente_sector: 'Nonguén' })).toEqual([
        {
          cliente: {
            direcciones: {
              some: { principal: true, sector: { sector: 'Nonguén' } },
            },
          },
        },
      ]);
    });

    it('`cliente_zona` baja un nivel más, hasta la zona del sector', () => {
      expect(clausulas({ cliente_zona: 'Concepción' })).toEqual([
        {
          cliente: {
            direcciones: {
              some: { principal: true, sector: { zona: { zona: 'Concepción' } } },
            },
          },
        },
      ]);
    });
  });

  describe('entrada inválida', () => {
    it('un `id` no numérico se descarta en vez de dar 400', () => {
      // Es lo que hace django-filter, que es contra lo que está escrito el
      // frontend: un listado no se rompe porque alguien tipeó una letra.
      expect(engine.build({ id: 'abc' }).where).toEqual({});
      expect(clausulas({ id: '42' })).toEqual([{ id: 42 }]);
    });

    it('el literal "None" del frontend no filtra nada', () => {
      // Es lo que manda un `rx.select` cuando se limpia.
      expect(engine.build({ voucherType: 'None' }).where).toEqual({});
    });
  });
});

function valorDePrueba(param: string): string {
  if (param.endsWith('_after') || param.endsWith('_before')) return '2026-01-01';
  if (param === 'cliente_existe') return 'true';
  if (param === 'id' || param === 'fiscalYear') return '1';
  return 'texto';
}
