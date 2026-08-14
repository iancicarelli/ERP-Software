import { FilterEngine } from '../common';
import { ORDEN_FILTERS } from './ordenes.filters';

/**
 * ============================================================================
 * El mapa de filtros de órdenes contra el motor real — Fase 7
 * ----------------------------------------------------------------------------
 * Mismo criterio que `clientes.filters.spec.ts`, con cuatro veces más params:
 * los dos primeros tests verifican que cada clave de
 * `config/order/order_filter_config.py` tenga con qué responder de este lado, y
 * que no sobre ninguna. Un filtro que el usuario activa y el backend ignora no
 * da error: devuelve resultados de más, en silencio.
 * ============================================================================
 */
describe('ORDEN_FILTERS', () => {
  const engine = new FilterEngine(ORDEN_FILTERS);
  const clausulas = (query: Record<string, unknown>) =>
    engine.build(query).where.AND as Record<string, unknown>[];

  /** Las 52 claves de `ORDER_FILTER_CONFIG`, transcritas del frontend. */
  const PARAMS_DEL_FRONTEND = [
    'search',

    'fecha_ingreso_after',
    'fecha_ingreso_before',
    'fecha_contrato_after',
    'fecha_contrato_before',
    'fecha_pago_after',
    'fecha_pago_before',
    'fecha_programado_after',
    'fecha_programado_before',
    'fecha_instalado_after',
    'fecha_instalado_before',

    'estado_estado',
    'sector_sector',
    'zona_zona',
    'zona_exclude',

    'contrato_nuevo',
    'comision',
    'comision_pagada',
    'pago_instalacion',
    'abierto',
    'modificacion_plan',
    'migracion',
    'traslado',
    'evaluacion',
    'bienvenida',
    'medidor_luz',
    'ducto',
    'poda',
    'postacion',
    'vecino',

    'causa_causa',
    'servicio_servicio',

    'anexos_extras',
    'anexos_extras_min',
    'anexos_extras_max',
    'anexos_extras_exterior',
    'anexos_extras_exterior_min',
    'anexos_extras_exterior_max',
    'sintonizadores',
    'sintonizadores_min',
    'sintonizadores_max',
    'extensores_wifi',
    'extensores_wifi_min',
    'extensores_wifi_max',

    'rut',
    'id',
    'vendedor_nombre1',
    'vendedor_apellido1',
    'vendedor_apellido2',
    'tecnico_nombre1',
    'tecnico_apellido1',
    'tecnico_apellido2',
  ];

  it('el config del frontend declara 52 params', () => {
    // Si este número cambia, alguien tocó el config y hay que revisar el mapa.
    expect(PARAMS_DEL_FRONTEND).toHaveLength(52);
  });

  it('responde a los 52 params del config del frontend', () => {
    const sinEfecto = PARAMS_DEL_FRONTEND.filter((param) => {
      const { where, counts } = engine.build({ [param]: valorDePrueba(param) });
      const vacio = Object.keys(where).length === 0;
      return vacio && counts.length === 0;
    });

    expect(sinEfecto).toEqual([]);
  });

  it('no declara filtros que el frontend nunca manda', () => {
    const declarados = Object.keys(ORDEN_FILTERS);
    // Los `daterange` y `numrange` se declaran por prefijo, no por param.
    const prefijos = [
      'fecha_ingreso',
      'fecha_contrato',
      'fecha_pago',
      'fecha_programado',
      'fecha_instalado',
      'anexos_extras',
      'anexos_extras_exterior',
      'sintonizadores',
      'extensores_wifi',
    ];

    const sobrantes = declarados.filter(
      (clave) => !PARAMS_DEL_FRONTEND.includes(clave) && !prefijos.includes(clave),
    );

    expect(sobrantes).toEqual([]);
  });

  describe('el snapshot manda (D9)', () => {
    it('`search` y `rut` van contra las columnas de la orden, no del cliente', () => {
      // Una orden con `cliente_id` en null tiene que poder encontrarse igual.
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

      expect(clausulas({ rut: '16.204' })).toEqual([
        { rut: { contains: '16.204', mode: 'insensitive' } },
      ]);
    });
  });

  describe('ubicación — sin `scope`, a diferencia de clientes', () => {
    it('`sector_sector` y `zona_zona` son relaciones to-one directas', () => {
      // La orden tiene `zona_id` y `sector_id` propios: no hay que pasar por la
      // dirección principal como en D4.
      expect(clausulas({ sector_sector: 'Nonguén' })).toEqual([
        { sector: { sector: 'Nonguén' } },
      ]);
      expect(clausulas({ zona_zona: 'Concepción' })).toEqual([
        { zona: { zona: 'Concepción' } },
      ]);
    });

    it('`zona_exclude` es el NOT de la misma relación', () => {
      expect(clausulas({ zona_exclude: 'Angol' })).toEqual([
        { NOT: { zona: { zona: 'Angol' } } },
      ]);
    });

    it('zona y sector a la vez conviven sin pisarse', () => {
      expect(clausulas({ sector_sector: 'Nonguén', zona_zona: 'Concepción' })).toHaveLength(2);
    });
  });

  describe('catálogos — exacto vs icontains', () => {
    it('`estado_estado` es igualdad exacta: la lista del frontend calza', () => {
      expect(clausulas({ estado_estado: 'Instalado' })).toEqual([
        { estado: { estado: 'Instalado' } },
      ]);
    });

    it('`servicio_servicio` es icontains: el frontend manda MAYÚSCULAS', () => {
      // El select se llena con `ELEMENTOS` ("PLAN DUO CLASICO") y la tabla
      // guarda "Plan Duo Clasico". Con igualdad exacta esto daría 0 filas.
      expect(clausulas({ servicio_servicio: 'PLAN DUO CLASICO' })).toEqual([
        { servicio: { servicio: { contains: 'PLAN DUO CLASICO', mode: 'insensitive' } } },
      ]);
    });

    it('`causa_causa` es icontains contra `causas_orden`', () => {
      expect(clausulas({ causa_causa: 'Falta de poste' })).toEqual([
        { causa: { causa: { contains: 'Falta de poste', mode: 'insensitive' } } },
      ]);
    });
  });

  describe('D8 — personas por icontains', () => {
    it('un nombre compuesto se encuentra por su primera palabra', () => {
      // Esto es lo que hace que el corte `nombre1`/`apellido1` deje de importar:
      // "Juan" encuentra a "Juan Carlos".
      expect(clausulas({ tecnico_nombre1: 'Juan' })).toEqual([
        { tecnico: { nombre1: { contains: 'Juan', mode: 'insensitive' } } },
      ]);
    });

    it('vendedor y técnico son relaciones distintas', () => {
      expect(clausulas({ vendedor_apellido1: 'Pino', tecnico_apellido1: 'Quiroz' })).toEqual([
        { vendedor: { apellido1: { contains: 'Pino', mode: 'insensitive' } } },
        { tecnico: { apellido1: { contains: 'Quiroz', mode: 'insensitive' } } },
      ]);
    });
  });

  describe('cantidades', () => {
    it('`anexos_extras` y `anexos_extras_exterior` no se pisan', () => {
      // El motor hace lookup exacto por clave: `anexos_extras_exterior_min` NO
      // lo captura el rango de `anexos_extras` aunque comparta el prefijo.
      expect(clausulas({ anexos_extras_min: '2', anexos_extras_exterior_max: '5' })).toEqual([
        { anexos_extras: { gte: 2 } },
        { anexos_extras_exterior: { lte: 5 } },
      ]);
    });

    it('min y max del mismo campo conviven', () => {
      expect(clausulas({ sintonizadores_min: '1', sintonizadores_max: '3' })).toEqual([
        { sintonizadores: { gte: 1 } },
        { sintonizadores: { lte: 3 } },
      ]);
    });
  });

  it('`_before` es límite superior EXCLUSIVO', () => {
    expect(clausulas({ fecha_ingreso_before: '2026-02-01' })).toEqual([
      { fecha_ingreso: { lt: new Date('2026-02-01T00:00:00.000Z') } },
    ]);
  });

  it('los 15 flags aceptan lo que manda httpx', () => {
    expect(clausulas({ abierto: 'true', comision_pagada: 'false' })).toEqual([
      { abierto: true },
      { comision_pagada: false },
    ]);
  });

  it('un valor que no castea se descarta y el listado sigue', () => {
    expect(engine.build({ id: 'abc' }).where).toEqual({});
  });

  it('sin filtros el where queda vacío', () => {
    expect(
      engine.build({ page: '2', page_size: '50', format: 'json' }).where,
    ).toEqual({});
  });
});

/** Un valor plausible por param, para el test de cobertura. */
function valorDePrueba(param: string): string {
  if (param.endsWith('_after') || param.endsWith('_before')) return '2026-01-01';
  if (param.endsWith('_min') || param.endsWith('_max')) return '2';

  const flags = [
    'contrato_nuevo', 'comision', 'comision_pagada', 'pago_instalacion',
    'abierto', 'modificacion_plan', 'migracion', 'traslado', 'evaluacion',
    'bienvenida', 'medidor_luz', 'ducto', 'poda', 'postacion', 'vecino',
  ];
  if (flags.includes(param)) return 'true';

  const enteros = [
    'id', 'anexos_extras', 'anexos_extras_exterior', 'sintonizadores',
    'extensores_wifi',
  ];
  if (enteros.includes(param)) return '1';

  return 'texto';
}
