import { CountFilterRequest } from './filter-map.types';

/**
 * ============================================================================
 * Resolución de los filtros por CONTEO de relación (`countrange`).
 * ----------------------------------------------------------------------------
 * Prisma no sabe filtrar por `_count` dentro de un `where`, así que
 * `cantidad_direcciones_min/max` no se puede expresar con el cliente tipado.
 * La salida es una subconsulta que devuelve los ids que cumplen el conteo, y
 * después se cruza con un `id IN (…)`.
 *
 * Se usa `$queryRawUnsafe` con placeholders `$1`/`$2` para los VALORES; los
 * identificadores (tabla y columna) vienen del `FilterMap` —código nuestro, no
 * entrada del usuario— y aun así se validan contra un patrón estricto antes de
 * interpolarse. Sin esa validación esto sería una inyección SQL.
 * ============================================================================
 */

/** Lo mínimo que el resolver necesita de Prisma (facilita testear sin BD). */
export interface RawQueryRunner {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/i;

function quote(identifier: string): string {
  if (!IDENTIFIER.test(identifier)) {
    throw new Error(
      `Identificador SQL inválido en un countrange: "${identifier}". ` +
        'Solo se permiten letras, dígitos y guion bajo.',
    );
  }
  return `"${identifier}"`;
}

/**
 * Traduce cada `CountFilterRequest` a una cláusula de `where` lista para
 * sumarse al `AND` que devolvió el `FilterEngine`.
 *
 *   const { where, counts } = engine.build(query);
 *   const extra = await resolveCountFilters(prisma, counts);
 *   const finalWhere = mergeCountClauses(where, extra);
 */
export async function resolveCountFilters(
  db: RawQueryRunner,
  requests: CountFilterRequest[],
): Promise<Record<string, unknown>[]> {
  const clauses: Record<string, unknown>[] = [];

  for (const request of requests) {
    const plan = planFor(request);
    if (!plan) continue;

    const { table, groupBy, targetField } = request.relation;
    const column = quote(groupBy);

    const sql =
      `SELECT ${column} AS target_id FROM ${quote(table)} ` +
      `WHERE ${column} IS NOT NULL ` +
      `GROUP BY ${column} ` +
      `HAVING ${plan.having}`;

    const rows = await db.$queryRawUnsafe<{ target_id: number | bigint }[]>(
      sql,
      ...plan.params,
    );
    const ids = rows.map((row) => Number(row.target_id));

    // `include`  → el conteo se cumple en las filas devueltas.
    // `!include` → la subconsulta trajo las que NO lo cumplen (el caso de un
    //   mínimo de 0: las entidades sin ninguna fila relacionada no aparecen en
    //   un GROUP BY, así que hay que ir por el complemento).
    clauses.push(
      plan.include
        ? { [targetField]: { in: ids } }
        : { NOT: { [targetField]: { in: ids } } },
    );
  }

  return clauses;
}

interface CountPlan {
  having: string;
  params: number[];
  /** true → los ids devueltos son los que MATCHEAN; false → los que NO. */
  include: boolean;
}

function planFor(request: CountFilterRequest): CountPlan | null {
  const { equals, min, max } = request;

  if (equals !== undefined) {
    return equals <= 0
      ? // "exactamente 0" = las que no tienen ninguna fila relacionada.
        { having: 'COUNT(*) >= $1', params: [1], include: false }
      : { having: 'COUNT(*) = $1', params: [equals], include: true };
  }

  if (min !== undefined && min > 0) {
    if (max !== undefined) {
      return {
        having: 'COUNT(*) >= $1 AND COUNT(*) <= $2',
        params: [min, max],
        include: true,
      };
    }
    return { having: 'COUNT(*) >= $1', params: [min], include: true };
  }

  if (max !== undefined) {
    // Un mínimo de 0 (o ausente) con máximo: el complemento de "se pasa del
    // máximo" incluye a las entidades con cero relaciones, que es lo correcto.
    return { having: 'COUNT(*) > $1', params: [max], include: false };
  }

  // `min = 0` sin máximo no restringe nada.
  return null;
}

/** Suma las cláusulas de conteo al `where` que devolvió el `FilterEngine`. */
export function mergeCountClauses(
  where: Record<string, unknown>,
  clauses: Record<string, unknown>[],
): Record<string, unknown> {
  if (clauses.length === 0) return where;
  const existing = Array.isArray(where.AND) ? (where.AND as unknown[]) : [];
  return { ...where, AND: [...existing, ...clauses] };
}
