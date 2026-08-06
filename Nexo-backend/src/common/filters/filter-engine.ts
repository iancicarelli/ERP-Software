import {
  CountFilterRequest,
  FilterCast,
  FilterMap,
  FilterResult,
  FilterScope,
  RawQuery,
} from './filter-map.types';

/**
 * ============================================================================
 * FilterEngine — traduce el query crudo de una request al `where` de Prisma.
 * ----------------------------------------------------------------------------
 * Un solo motor para las 5 entidades. Lo reusan el listado, `all-ids` y
 * `bulk-action`, que por contrato deben aplicar EXACTAMENTE los mismos filtros
 * (ROADMAP §3.8).
 *
 * Uso:
 *   const engine = new FilterEngine(CLIENTE_FILTERS);
 *   const { where, counts } = engine.build(req.query);
 *
 * Ver `filter-map.types.ts` para la regla de nombres y la notación de rutas.
 *
 * COMPORTAMIENTO ANTE ENTRADA INVÁLIDA: un valor que no castea (un `id=abc`
 * con `cast: 'int'`, una fecha malformada) se DESCARTA en silencio y la
 * consulta sigue sin ese filtro. Es lo que hace django-filter, que es contra
 * lo que está escrito el frontend. No se devuelve 400: un listado no debería
 * romperse porque el usuario tipeó una letra en un campo numérico.
 * ============================================================================
 */
export class FilterEngine {
  constructor(private readonly map: FilterMap) {}

  build(query: RawQuery): FilterResult {
    const clauses: Record<string, unknown>[] = [];
    const counts: CountFilterRequest[] = [];

    for (const [key, def] of Object.entries(this.map)) {
      switch (def.type) {
        case 'exact': {
          const values = allValues(query[key]);
          if (values.length === 0) break;
          const casted = castAll(values, def.cast ?? 'string');
          if (casted.length === 0) break;
          const leaf = casted.length === 1 ? casted[0] : { in: casted };
          clauses.push(nest(def.field, leaf, def.scope));
          break;
        }

        case 'relation': {
          const values = allValues(query[key]);
          if (values.length === 0) break;
          const casted = castAll(values, def.cast ?? 'string');
          if (casted.length === 0) break;
          const leaf = casted.length === 1 ? casted[0] : { in: casted };
          clauses.push(nest(def.path, leaf, def.scope));
          break;
        }

        case 'icontains': {
          const value = firstValue(query[key]);
          if (value === undefined) break;
          clauses.push(nest(def.field, insensitiveContains(value), def.scope));
          break;
        }

        case 'boolean': {
          const value = castOne(firstValue(query[key]), 'boolean');
          if (value === undefined) break;
          clauses.push(nest(def.field, value, def.scope));
          break;
        }

        case 'daterange': {
          const after = castOne(firstValue(query[`${key}_after`]), 'date');
          if (after !== undefined) {
            clauses.push(nest(def.field, { gte: after }, def.scope));
          }
          // Límite superior EXCLUSIVO — ver DateRangeFilterDef.
          const before = castOne(firstValue(query[`${key}_before`]), 'date');
          if (before !== undefined) {
            clauses.push(nest(def.field, { lt: before }, def.scope));
          }
          break;
        }

        case 'numrange': {
          const cast = def.cast ?? 'int';
          const exact = castOne(firstValue(query[key]), cast);
          if (exact !== undefined) {
            clauses.push(nest(def.field, { equals: exact }, def.scope));
          }
          const min = castOne(firstValue(query[`${key}_min`]), cast);
          if (min !== undefined) {
            clauses.push(nest(def.field, { gte: min }, def.scope));
          }
          const max = castOne(firstValue(query[`${key}_max`]), cast);
          if (max !== undefined) {
            clauses.push(nest(def.field, { lte: max }, def.scope));
          }
          break;
        }

        case 'countrange': {
          const equals = castOne(firstValue(query[key]), 'int') as number | undefined;
          const min = castOne(firstValue(query[`${key}_min`]), 'int') as number | undefined;
          const max = castOne(firstValue(query[`${key}_max`]), 'int') as number | undefined;
          if (equals === undefined && min === undefined && max === undefined) break;
          counts.push({
            relation: {
              table: def.relation.table,
              groupBy: def.relation.groupBy,
              targetField: def.relation.targetField ?? 'id',
            },
            ...(equals !== undefined ? { equals } : {}),
            ...(min !== undefined ? { min } : {}),
            ...(max !== undefined ? { max } : {}),
          });
          break;
        }

        case 'exclude': {
          const values = allValues(query[key]);
          if (values.length === 0) break;
          const casted = castAll(values, def.cast ?? 'string');
          if (casted.length === 0) break;
          const leaf = casted.length === 1 ? casted[0] : { in: casted };
          clauses.push({ NOT: nest(def.path, leaf, def.scope) });
          break;
        }

        case 'not': {
          const value = castOne(firstValue(query[key]), def.cast ?? 'string');
          if (value === undefined) break;
          clauses.push(nest(def.field, { not: value }, def.scope));
          break;
        }

        case 'search': {
          const value = firstValue(query[key]);
          if (value === undefined) break;
          clauses.push({
            OR: def.fields.map((field) =>
              nest(field, insensitiveContains(value), def.scope),
            ),
          });
          break;
        }

        case 'computed': {
          const value = castOne(firstValue(query[key]), def.cast ?? 'boolean');
          if (value === undefined) break;
          const clause = def.apply(value);
          if (clause) clauses.push(clause);
          break;
        }
      }
    }

    return {
      where: clauses.length > 0 ? { AND: clauses } : {},
      counts,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function insensitiveContains(value: string): Record<string, unknown> {
  return { contains: value, mode: 'insensitive' };
}

/**
 * Arma el objeto anidado que corresponde a una ruta.
 *
 *   nest('rut', {contains:'x'})                    → { rut: { contains:'x' } }
 *   nest('sector.zona.zona', 'Sur')                → { sector: { zona: { zona:'Sur' } } }
 *   nest('direcciones[].sector.sector', 'Centro',
 *        { direcciones: { principal: true } })
 *     → { direcciones: { some: { principal:true, sector:{ sector:'Centro' } } } }
 */
export function nest(
  path: string,
  leaf: unknown,
  scope?: FilterScope,
): Record<string, unknown> {
  const segments = path.split('.');
  let acc: unknown = leaf;

  for (let i = segments.length - 1; i >= 0; i--) {
    const raw = segments[i];
    const isMany = raw.endsWith('[]');
    const name = isMany ? raw.slice(0, -2) : raw;

    acc = isMany
      ? { [name]: { some: { ...(scope?.[name] ?? {}), ...(acc as object) } } }
      : { [name]: acc };
  }

  return acc as Record<string, unknown>;
}

/**
 * Primer valor utilizable de un query param. Descarta vacíos y el literal
 * `"None"`, que es lo que manda el frontend cuando un select se limpia.
 */
export function firstValue(raw: unknown): string | undefined {
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const value = firstValue(item);
      if (value !== undefined) return value;
    }
    return undefined;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed === '' || trimmed === 'None' ? undefined : trimmed;
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  return undefined;
}

/** Todos los valores utilizables (el param puede venir repetido → `in`/`notIn`). */
export function allValues(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => allValues(item));
  }
  const value = firstValue(raw);
  return value === undefined ? [] : [value];
}

/** Castea o devuelve `undefined` si el valor no es representable. */
export function castOne(
  value: string | undefined,
  kind: FilterCast,
): unknown | undefined {
  if (value === undefined) return undefined;

  switch (kind) {
    case 'string':
      return value;

    case 'int': {
      // Rechaza "12abc" y "1.5": Number() es estricto, parseInt no.
      if (!/^[+-]?\d+$/.test(value)) return undefined;
      const parsed = Number(value);
      return Number.isSafeInteger(parsed) ? parsed : undefined;
    }

    case 'float': {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    case 'boolean': {
      const normalized = value.toLowerCase();
      if (['true', '1', 'si', 'sí', 'yes'].includes(normalized)) return true;
      if (['false', '0', 'no'].includes(normalized)) return false;
      return undefined;
    }

    case 'date': {
      // `YYYY-MM-DD` se interpreta como medianoche UTC, que es lo que quiere
      // Prisma para columnas `@db.Date`.
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
  }
}

function castAll(values: string[], kind: FilterCast): unknown[] {
  return values
    .map((value) => castOne(value, kind))
    .filter((value) => value !== undefined);
}
