import { FilterEngine } from '../common';
import { CLIENTE_FILTERS } from './clientes.filters';

/**
 * ============================================================================
 * El mapa de filtros contra el motor real — Fase 5
 * ----------------------------------------------------------------------------
 * `filter-engine.spec.ts` prueba el MOTOR con un fixture; esto prueba el MAPA
 * que va a producción, con los nombres de param exactos que manda el frontend
 * (`config/client_filter_config.py`).
 *
 * Los dos primeros tests son los que más valen: verifican que cada clave del
 * config del frontend tenga con qué responder de este lado. Un filtro que el
 * usuario activa y el backend ignora no da error — devuelve resultados de más,
 * en silencio.
 * ============================================================================
 */
describe('CLIENTE_FILTERS', () => {
  const engine = new FilterEngine(CLIENTE_FILTERS);
  const clausulas = (query: Record<string, unknown>) =>
    engine.build(query).where.AND as Record<string, unknown>[];

  /** Todas las claves de `CLIENT_FILTER_CONFIG`, transcritas del frontend. */
  const PARAMS_DEL_FRONTEND = [
    'search',
    'fecha_creacion_after',
    'fecha_creacion_before',
    'moroso_desde_after',
    'moroso_desde_before',
    'fecha_de_baja_after',
    'fecha_de_baja_before',
    'sector',
    'zona',
    'zona_exclude',
    'activo',
    'por_instalar',
    'moroso',
    'analogo',
    'corte_poste',
    'baja_por_renuncia',
    'baja_por_morosidad',
    'causa_de_baja',
    'donacion',
    'servicio_elemento',
    'krill',
    'cpes_todos',
    'cpes_inactivos',
    'cantidad_direcciones_min',
    'cantidad_direcciones_max',
    'cpes_todos_min',
    'cpes_todos_max',
    'monto_total_min',
    'monto_total_max',
    'monto_total',
    'cpes_inactivos_min',
    'cpes_inactivos_max',
    'rut',
    'id',
  ];

  it('responde a los 34 params del config del frontend', () => {
    const sinEfecto = PARAMS_DEL_FRONTEND.filter((param) => {
      const { where, counts } = engine.build({ [param]: valorDePrueba(param) });
      const vacio = Object.keys(where).length === 0;
      return vacio && counts.length === 0;
    });

    expect(sinEfecto).toEqual([]);
  });

  it('no declara filtros que el frontend nunca manda', () => {
    // Los tres tipos de rango se declaran por prefijo, no por param.
    const declarados = Object.keys(CLIENTE_FILTERS);
    const prefijos = ['fecha_creacion', 'moroso_desde', 'fecha_de_baja', 'cpes_todos', 'cpes_inactivos', 'monto_total', 'cantidad_direcciones'];

    const sobrantes = declarados.filter(
      (clave) => !PARAMS_DEL_FRONTEND.includes(clave) && !prefijos.includes(clave),
    );

    expect(sobrantes).toEqual([]);
  });

  describe('D4 — sector y zona por la dirección principal', () => {
    it('`sector` filtra dentro del `some` acotado a la principal', () => {
      expect(clausulas({ sector: 'Gamboa' })).toEqual([
        { direcciones: { some: { principal: true, sector: { sector: 'Gamboa' } } } },
      ]);
    });

    it('`zona` atraviesa sector → zona', () => {
      expect(clausulas({ zona: 'Castro' })).toEqual([
        {
          direcciones: {
            some: { principal: true, sector: { zona: { zona: 'Castro' } } },
          },
        },
      ]);
    });

    it('`zona_exclude` es el NOT del mismo `some`', () => {
      expect(clausulas({ zona_exclude: 'Ancud' })).toEqual([
        {
          NOT: {
            direcciones: {
              some: { principal: true, sector: { zona: { zona: 'Ancud' } } },
            },
          },
        },
      ]);
    });

    it('sector y zona a la vez conviven sin pisarse', () => {
      // Dos cláusulas separadas dentro del AND, no un merge de la relación:
      // un merge dejaría una sola condición y ensancharía el resultado.
      expect(clausulas({ sector: 'Gamboa', zona: 'Castro' })).toHaveLength(2);
    });
  });

  it('`search` busca por nombre, apellidos y RUT', () => {
    expect(clausulas({ search: 'huentelicán' })).toEqual([
      {
        OR: [
          { nombre1: { contains: 'huentelicán', mode: 'insensitive' } },
          { apellido1: { contains: 'huentelicán', mode: 'insensitive' } },
          { apellido2: { contains: 'huentelicán', mode: 'insensitive' } },
          { rut: { contains: 'huentelicán', mode: 'insensitive' } },
        ],
      },
    ]);
  });

  it('las causas y elementos llegan como NOMBRE, no como id', () => {
    // El `rx.select` del filtro se puebla con etiquetas (`CAUSAS_BAJA`,
    // `ELEMENTOS`), así que el filtro tiene que ir contra el texto.
    expect(clausulas({ causa_de_baja: 'Por morosidad' })).toEqual([
      { causa_de_baja: { causa: 'Por morosidad' } },
    ]);
    expect(clausulas({ servicio_elemento: 'TV ANALOGO' })).toEqual([
      { servicios: { some: { elemento: { elemento: 'TV ANALOGO' } } } },
    ]);
  });

  it('`_before` es límite superior EXCLUSIVO', () => {
    expect(clausulas({ fecha_creacion_before: '2026-02-01' })).toEqual([
      { fecha_creacion: { lt: new Date('2026-02-01T00:00:00.000Z') } },
    ]);
  });

  it('`cantidad_direcciones_min/max` sale como countrange, no como where', () => {
    const { where, counts } = engine.build({
      cantidad_direcciones_min: '2',
      cantidad_direcciones_max: '5',
    });

    // Prisma no sabe filtrar por `_count`: lo resuelve `resolveCountFilters()`.
    expect(where).toEqual({});
    expect(counts).toEqual([
      {
        relation: { table: 'direcciones', groupBy: 'cliente_id', targetField: 'id' },
        min: 2,
        max: 5,
      },
    ]);
  });

  it('los booleanos aceptan lo que manda httpx', () => {
    expect(clausulas({ activo: 'true', moroso: 'false' })).toEqual([
      { activo: true },
      { moroso: false },
    ]);
  });

  it('un valor que no castea se descarta y el listado sigue', () => {
    // django-filter hace lo mismo; el frontend no maneja un 400 en listados.
    expect(engine.build({ id: 'abc' }).where).toEqual({});
  });

  it('sin filtros el where queda vacío', () => {
    expect(engine.build({ page: '2', page_size: '50', format: 'json' }).where).toEqual(
      {},
    );
  });
});

/** Un valor plausible por param, para el test de cobertura. */
function valorDePrueba(param: string): string {
  if (param.endsWith('_after') || param.endsWith('_before')) return '2026-01-01';
  if (param.endsWith('_min') || param.endsWith('_max')) return '2';
  if (['activo', 'por_instalar', 'moroso', 'analogo', 'corte_poste', 'baja_por_renuncia', 'baja_por_morosidad', 'donacion', 'krill'].includes(param)) {
    return 'true';
  }
  if (['id', 'cpes_todos', 'cpes_inactivos', 'monto_total'].includes(param)) return '1';
  return 'texto';
}
