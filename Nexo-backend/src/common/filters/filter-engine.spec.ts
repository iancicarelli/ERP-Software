import { FilterEngine, nest } from './filter-engine';
import { FilterMap } from './filter-map.types';

/**
 * El `FilterEngine` es la pieza con más superficie de error de todo el backend
 * (ROADMAP R1): +100 params, 4 convenciones de sufijos y camelCase mezclado.
 * Estos tests cubren cada tipo declarable y después el mapa real de clientes.
 */

/** Atajo: las cláusulas que produjo el engine, en orden. */
function clauses(result: { where: Record<string, unknown> }): unknown[] {
  return (result.where.AND as unknown[]) ?? [];
}

function buildWith(map: FilterMap, query: Record<string, unknown>) {
  return new FilterEngine(map).build(query);
}

describe('nest()', () => {
  it('arma una ruta simple', () => {
    expect(nest('rut', { contains: 'x' })).toEqual({ rut: { contains: 'x' } });
  });

  it('arma relaciones to-one anidadas', () => {
    expect(nest('sector.zona.zona', 'Sur')).toEqual({
      sector: { zona: { zona: 'Sur' } },
    });
  });

  it('convierte el segmento `[]` en un `some` y le aplica el scope', () => {
    expect(
      nest('direcciones[].sector.sector', 'Centro', {
        direcciones: { principal: true },
      }),
    ).toEqual({
      direcciones: {
        some: { principal: true, sector: { sector: 'Centro' } },
      },
    });
  });
});

describe('FilterEngine — tipos de filtro', () => {
  describe('exact', () => {
    const map: FilterMap = {
      estado: { type: 'exact', field: 'estado' },
      id: { type: 'exact', field: 'id', cast: 'int' },
    };

    it('genera una igualdad', () => {
      expect(clauses(buildWith(map, { estado: 'Ok' }))).toEqual([{ estado: 'Ok' }]);
    });

    it('convierte el param repetido en un `in`', () => {
      expect(clauses(buildWith(map, { estado: ['Ok', 'Pendiente'] }))).toEqual([
        { estado: { in: ['Ok', 'Pendiente'] } },
      ]);
    });

    it('castea a entero', () => {
      expect(clauses(buildWith(map, { id: '6329' }))).toEqual([{ id: 6329 }]);
    });

    it('descarta el filtro si el entero no parsea', () => {
      expect(clauses(buildWith(map, { id: '63a29' }))).toEqual([]);
      expect(clauses(buildWith(map, { id: '1.5' }))).toEqual([]);
    });
  });

  describe('icontains', () => {
    const map: FilterMap = { rut: { type: 'icontains', field: 'rut' } };

    it('genera un contains case-insensitive', () => {
      expect(clauses(buildWith(map, { rut: '16.204' }))).toEqual([
        { rut: { contains: '16.204', mode: 'insensitive' } },
      ]);
    });
  });

  describe('boolean', () => {
    const map: FilterMap = { activo: { type: 'boolean', field: 'activo' } };

    it.each([
      ['true', true],
      ['false', false],
      ['True', true],
      ['1', true],
      ['0', false],
      // El frontend normaliza Si/No antes de mandar, pero se aceptan igual.
      ['Si', true],
      ['No', false],
    ])('interpreta %s como %s', (raw, expected) => {
      expect(clauses(buildWith(map, { activo: raw }))).toEqual([
        { activo: expected },
      ]);
    });

    it('descarta un booleano no reconocible', () => {
      expect(clauses(buildWith(map, { activo: 'quizás' }))).toEqual([]);
    });
  });

  describe('daterange', () => {
    const map: FilterMap = {
      fecha_creacion: { type: 'daterange', field: 'fecha_creacion' },
    };

    it('`_after` es un límite inferior INCLUSIVO', () => {
      expect(clauses(buildWith(map, { fecha_creacion_after: '2026-08-03' }))).toEqual([
        { fecha_creacion: { gte: new Date('2026-08-03T00:00:00.000Z') } },
      ]);
    });

    it('`_before` es un límite superior EXCLUSIVO', () => {
      // El dashboard manda el día siguiente para incluir el día completo:
      // states/index/index_payment_state.py:27. Con `lte` contaría un día de más.
      expect(clauses(buildWith(map, { fecha_creacion_before: '2026-08-04' }))).toEqual([
        { fecha_creacion: { lt: new Date('2026-08-04T00:00:00.000Z') } },
      ]);
    });

    it('combina ambos extremos', () => {
      const result = buildWith(map, {
        fecha_creacion_after: '2026-08-01',
        fecha_creacion_before: '2026-09-01',
      });
      expect(clauses(result)).toEqual([
        { fecha_creacion: { gte: new Date('2026-08-01T00:00:00.000Z') } },
        { fecha_creacion: { lt: new Date('2026-09-01T00:00:00.000Z') } },
      ]);
    });

    it('descarta una fecha malformada', () => {
      expect(clauses(buildWith(map, { fecha_creacion_after: 'ayer' }))).toEqual([]);
    });

    it('no reacciona al param sin sufijo', () => {
      expect(clauses(buildWith(map, { fecha_creacion: '2026-08-03' }))).toEqual([]);
    });
  });

  describe('numrange', () => {
    const map: FilterMap = {
      monto_total: { type: 'numrange', field: 'monto_total' },
    };

    it('soporta el valor exacto', () => {
      expect(clauses(buildWith(map, { monto_total: '15000' }))).toEqual([
        { monto_total: { equals: 15000 } },
      ]);
    });

    it('soporta `_min` y `_max` a la vez', () => {
      expect(
        clauses(buildWith(map, { monto_total_min: '10000', monto_total_max: '20000' })),
      ).toEqual([
        { monto_total: { gte: 10000 } },
        { monto_total: { lte: 20000 } },
      ]);
    });

    it('acepta decimales cuando el cast es float', () => {
      const floatMap: FilterMap = {
        deuda: { type: 'numrange', field: 'deuda', cast: 'float' },
      };
      expect(clauses(buildWith(floatMap, { deuda_min: '1500.75' }))).toEqual([
        { deuda: { gte: 1500.75 } },
      ]);
    });
  });

  describe('countrange', () => {
    const map: FilterMap = {
      cantidad_direcciones: {
        type: 'countrange',
        relation: { table: 'direcciones', groupBy: 'cliente_id' },
      },
    };

    it('no toca el `where`: emite un descriptor aparte', () => {
      const result = buildWith(map, {
        cantidad_direcciones_min: '2',
        cantidad_direcciones_max: '5',
      });

      expect(result.where).toEqual({});
      expect(result.counts).toEqual([
        {
          relation: {
            table: 'direcciones',
            groupBy: 'cliente_id',
            targetField: 'id',
          },
          min: 2,
          max: 5,
        },
      ]);
    });

    it('soporta el conteo exacto', () => {
      expect(
        buildWith(map, { cantidad_direcciones: '3' }).counts[0],
      ).toMatchObject({ equals: 3 });
    });

    it('no emite nada si no viene ningún extremo', () => {
      expect(buildWith(map, {}).counts).toEqual([]);
    });
  });

  describe('relation', () => {
    const map: FilterMap = {
      zona: { type: 'relation', path: 'sector.zona.zona' },
      sector: {
        type: 'relation',
        path: 'direcciones[].sector.sector',
        scope: { direcciones: { principal: true } },
      },
    };

    it('atraviesa relaciones to-one', () => {
      expect(clauses(buildWith(map, { zona: 'Sur' }))).toEqual([
        { sector: { zona: { zona: 'Sur' } } },
      ]);
    });

    it('usa `some` con scope para relaciones to-many (D4)', () => {
      expect(clauses(buildWith(map, { sector: 'Centro' }))).toEqual([
        {
          direcciones: {
            some: { principal: true, sector: { sector: 'Centro' } },
          },
        },
      ]);
    });
  });

  describe('exclude', () => {
    const map: FilterMap = {
      zona_exclude: { type: 'exclude', path: 'sector.zona.zona' },
    };

    it('un valor genera un NOT', () => {
      expect(clauses(buildWith(map, { zona_exclude: 'Sur' }))).toEqual([
        { NOT: { sector: { zona: { zona: 'Sur' } } } },
      ]);
    });

    it('varios valores generan un NOT IN', () => {
      expect(clauses(buildWith(map, { zona_exclude: ['Sur', 'Norte'] }))).toEqual([
        { NOT: { sector: { zona: { zona: { in: ['Sur', 'Norte'] } } } } },
      ]);
    });
  });

  describe('not', () => {
    // La clave es el nombre literal del param: derivar el sufijo daría
    // `estado__not__not`.
    const map: FilterMap = {
      estado__not: { type: 'not', field: 'estado' },
    };

    it('genera un `!=`', () => {
      expect(clauses(buildWith(map, { estado__not: 'Ok' }))).toEqual([
        { estado: { not: 'Ok' } },
      ]);
    });
  });

  describe('search', () => {
    const map: FilterMap = {
      search: {
        type: 'search',
        fields: ['nombre1', 'apellido1', 'apellido2', 'rut'],
      },
    };

    it('genera un OR de contains sobre todos los campos', () => {
      expect(clauses(buildWith(map, { search: 'rain' }))).toEqual([
        {
          OR: [
            { nombre1: { contains: 'rain', mode: 'insensitive' } },
            { apellido1: { contains: 'rain', mode: 'insensitive' } },
            { apellido2: { contains: 'rain', mode: 'insensitive' } },
            { rut: { contains: 'rain', mode: 'insensitive' } },
          ],
        },
      ]);
    });

    it('soporta campos de relaciones', () => {
      const relMap: FilterMap = {
        search: { type: 'search', fields: ['cliente.rut', 'nombre'] },
      };
      expect(clauses(buildWith(relMap, { search: 'x' }))).toEqual([
        {
          OR: [
            { cliente: { rut: { contains: 'x', mode: 'insensitive' } } },
            { nombre: { contains: 'x', mode: 'insensitive' } },
          ],
        },
      ]);
    });
  });

  describe('computed', () => {
    // `cliente_existe` no es una columna: es `cliente_id IS NOT NULL`.
    const map: FilterMap = {
      cliente_existe: {
        type: 'computed',
        apply: (value) =>
          value === true ? { cliente_id: { not: null } } : { cliente_id: null },
      },
    };

    it('resuelve el caso verdadero', () => {
      expect(clauses(buildWith(map, { cliente_existe: 'true' }))).toEqual([
        { cliente_id: { not: null } },
      ]);
    });

    it('resuelve el caso falso', () => {
      expect(clauses(buildWith(map, { cliente_existe: 'false' }))).toEqual([
        { cliente_id: null },
      ]);
    });

    it('no aplica nada si `apply` devuelve null', () => {
      const noop: FilterMap = {
        x: { type: 'computed', apply: () => null },
      };
      expect(clauses(buildWith(noop, { x: 'true' }))).toEqual([]);
    });
  });
});

describe('FilterEngine — comportamiento general', () => {
  const map: FilterMap = {
    search: { type: 'search', fields: ['nombre1'] },
    activo: { type: 'boolean', field: 'activo' },
  };

  it('un query vacío no produce `where`', () => {
    expect(buildWith(map, {}).where).toEqual({});
  });

  it('ignora los params que no están en el mapa', () => {
    const result = buildWith(map, {
      page: '2',
      page_size: '500',
      limit: '1',
      format: 'json',
      inventado: 'x',
    });
    expect(result.where).toEqual({});
  });

  it('descarta valores vacíos y el literal "None"', () => {
    // El frontend manda "None" cuando se limpia un select.
    expect(buildWith(map, { search: '', activo: 'None' }).where).toEqual({});
    expect(buildWith(map, { search: '   ' }).where).toEqual({});
  });

  it('acumula cada filtro como una cláusula independiente del AND', () => {
    // Sin merge profundo: dos filtros sobre el mismo campo conviven sin
    // pisarse, que es lo que pasa con `_min` + `_max`.
    const result = buildWith(map, { search: 'ana', activo: 'true' });
    expect(result.where).toEqual({
      AND: [
        { OR: [{ nombre1: { contains: 'ana', mode: 'insensitive' } }] },
        { activo: true },
      ],
    });
  });
});

/**
 * Prueba de integración contra el mapa real de clientes
 * (`Nexo-frontend/Nexo/config/client_filter_config.py`). Cuando se implemente
 * la Fase 5, este mapa se muda a `clientes.filters.ts` tal cual.
 */
describe('FilterEngine — mapa real de clientes', () => {
  const CLIENTE_FILTERS: FilterMap = {
    search: {
      type: 'search',
      fields: ['nombre1', 'apellido1', 'apellido2', 'rut'],
    },
    rut: { type: 'icontains', field: 'rut' },
    id: { type: 'exact', field: 'id', cast: 'int' },

    fecha_creacion: { type: 'daterange', field: 'fecha_creacion' },
    moroso_desde: { type: 'daterange', field: 'moroso_desde' },
    fecha_de_baja: { type: 'daterange', field: 'fecha_de_baja' },

    // D4: el sector y la zona del cliente salen de su dirección principal.
    sector: {
      type: 'relation',
      path: 'direcciones[].sector.sector',
      scope: { direcciones: { principal: true } },
    },
    zona: {
      type: 'relation',
      path: 'direcciones[].sector.zona.zona',
      scope: { direcciones: { principal: true } },
    },
    zona_exclude: {
      type: 'exclude',
      path: 'direcciones[].sector.zona.zona',
      scope: { direcciones: { principal: true } },
    },

    activo: { type: 'boolean', field: 'activo' },
    por_instalar: { type: 'boolean', field: 'por_instalar' },
    moroso: { type: 'boolean', field: 'moroso' },
    analogo: { type: 'boolean', field: 'analogo' },
    corte_poste: { type: 'boolean', field: 'corte_poste' },
    baja_por_renuncia: { type: 'boolean', field: 'baja_por_renuncia' },
    baja_por_morosidad: { type: 'boolean', field: 'baja_por_morosidad' },
    donacion: { type: 'boolean', field: 'donacion' },
    krill: { type: 'boolean', field: 'krill' },

    causa_de_baja: { type: 'relation', path: 'causa_de_baja.causa' },
    servicio_elemento: { type: 'relation', path: 'servicios[].elemento.elemento' },

    cpes_todos: { type: 'numrange', field: 'cpes_todos' },
    cpes_inactivos: { type: 'numrange', field: 'cpes_inactivos' },
    monto_total: { type: 'numrange', field: 'monto_total' },

    cantidad_direcciones: {
      type: 'countrange',
      relation: { table: 'direcciones', groupBy: 'cliente_id' },
    },
  };

  const engine = new FilterEngine(CLIENTE_FILTERS);

  it('resuelve una combinación realista de filtros', () => {
    const result = engine.build({
      page: '1',
      page_size: '20',
      format: 'json',
      search: 'huentelicán',
      activo: 'true',
      moroso: 'false',
      zona: 'Sur',
      zona_exclude: 'Norte',
      monto_total_min: '10000',
      fecha_creacion_after: '2026-01-01',
      fecha_creacion_before: '2027-01-01',
      cantidad_direcciones_min: '2',
    });

    expect(result.where).toEqual({
      AND: [
        {
          OR: [
            { nombre1: { contains: 'huentelicán', mode: 'insensitive' } },
            { apellido1: { contains: 'huentelicán', mode: 'insensitive' } },
            { apellido2: { contains: 'huentelicán', mode: 'insensitive' } },
            { rut: { contains: 'huentelicán', mode: 'insensitive' } },
          ],
        },
        { fecha_creacion: { gte: new Date('2026-01-01T00:00:00.000Z') } },
        { fecha_creacion: { lt: new Date('2027-01-01T00:00:00.000Z') } },
        {
          direcciones: {
            some: { principal: true, sector: { zona: { zona: 'Sur' } } },
          },
        },
        {
          NOT: {
            direcciones: {
              some: { principal: true, sector: { zona: { zona: 'Norte' } } },
            },
          },
        },
        { activo: true },
        { moroso: false },
        { monto_total: { gte: 10000 } },
      ],
    });

    expect(result.counts).toEqual([
      {
        relation: {
          table: 'direcciones',
          groupBy: 'cliente_id',
          targetField: 'id',
        },
        min: 2,
      },
    ]);
  });

  it('atraviesa una relación to-many sin scope (servicio_elemento)', () => {
    expect(clauses(engine.build({ servicio_elemento: 'INTERNET 100' }))).toEqual([
      { servicios: { some: { elemento: { elemento: 'INTERNET 100' } } } },
    ]);
  });

  it('sin filtros activos el where queda vacío (listado completo)', () => {
    expect(engine.build({ page: '3', page_size: '50' }).where).toEqual({});
  });
});

/**
 * Los pagos son el caso raro del contrato: los params llegan en camelCase
 * (`entryDate_after`, `fiscalYear`, `voucherType`…) pero las columnas son
 * snake_case. El mapa es justamente el lugar donde se traduce eso.
 */
describe('FilterEngine — params camelCase de pagos', () => {
  const PAGO_FILTERS: FilterMap = {
    entryDate: { type: 'daterange', field: 'entry_date' },
    fiscalYear: { type: 'exact', field: 'fiscal_year', cast: 'int' },
    voucherType: { type: 'exact', field: 'voucher_type' },
    documentType: { type: 'exact', field: 'document_type' },
    entryUser: { type: 'exact', field: 'entry_user' },
    cliente_sector: {
      type: 'relation',
      path: 'cliente.direcciones[].sector.sector',
      scope: { direcciones: { principal: true } },
    },
    cliente_existe: {
      type: 'computed',
      apply: (value) =>
        value === true ? { cliente_id: { not: null } } : { cliente_id: null },
    },
  };

  it('mapea cada param camelCase a su columna snake_case', () => {
    const result = new FilterEngine(PAGO_FILTERS).build({
      entryDate_after: '2026-08-03',
      entryDate_before: '2026-08-04',
      fiscalYear: '2026',
      voucherType: 'INGRESO',
      entryUser: 'ADMIN',
      cliente_existe: 'false',
    });

    expect(clauses(result)).toEqual([
      { entry_date: { gte: new Date('2026-08-03T00:00:00.000Z') } },
      { entry_date: { lt: new Date('2026-08-04T00:00:00.000Z') } },
      { fiscal_year: 2026 },
      { voucher_type: 'INGRESO' },
      { entry_user: 'ADMIN' },
      { cliente_id: null },
    ]);
  });

  it('resuelve el sector del cliente a través de su dirección principal', () => {
    expect(
      clauses(new FilterEngine(PAGO_FILTERS).build({ cliente_sector: 'Centro' })),
    ).toEqual([
      {
        cliente: {
          direcciones: {
            some: { principal: true, sector: { sector: 'Centro' } },
          },
        },
      },
    ]);
  });
});
