/**
 * ============================================================================
 * Tipos del motor de filtros declarativo (ROADMAP §4)
 * ----------------------------------------------------------------------------
 * El frontend define +100 parámetros de filtro repartidos en 5 configs
 * (`Nexo-frontend/Nexo/config/*_filter_config.py`). Escribirlos a mano uno por
 * uno sería inmantenible: en vez de eso, cada entidad declara un `FilterMap` y
 * el `FilterEngine` traduce el query crudo a un `where` de Prisma.
 *
 * REGLA DE NOMBRES — la clave del mapa ES el nombre del query param, salvo en
 * los tres tipos "generadores de rango", que derivan sus params de un prefijo:
 *
 *   | type       | params que consume                        |
 *   |------------|-------------------------------------------|
 *   | exact      | `<key>`                                   |
 *   | icontains  | `<key>`                                   |
 *   | boolean    | `<key>`                                   |
 *   | relation   | `<key>`                                   |
 *   | exclude    | `<key>`   (la clave ya incluye `_exclude`) |
 *   | not        | `<key>`   (la clave ya incluye `__not`)    |
 *   | search     | `<key>`                                   |
 *   | computed   | `<key>`                                   |
 *   | daterange  | `<key>_after`, `<key>_before`             |
 *   | numrange   | `<key>`, `<key>_min`, `<key>_max`         |
 *   | countrange | `<key>`, `<key>_min`, `<key>_max`         |
 *
 * Por eso `estado__not` y `zona_exclude` se declaran con la clave literal y un
 * `field`/`path` que apunta a la columna real: intentar derivar el sufijo
 * llevaría a `estado__not__not`.
 *
 * RUTAS (`field` / `path`). Notación con puntos para atravesar relaciones:
 *   - `rut`                      → columna directa
 *   - `sector.zona.zona`         → relación to-one anidada
 *   - `direcciones[].sector.sector` → relación to-many; `[]` genera un `some`
 *
 * El sufijo `[]` se combina con `scope` para acotar el `some`:
 *
 *   {
 *     type: 'relation',
 *     path: 'direcciones[].sector.sector',
 *     scope: { direcciones: { principal: true } },
 *   }
 *   → { direcciones: { some: { principal: true, sector: { sector: <valor> } } } }
 *
 * Eso es exactamente lo que necesita D4: el `sector` del cliente se resuelve
 * por su dirección principal, no por una columna propia.
 * ============================================================================
 */

/** Conversión aplicada al valor crudo (siempre string) antes de armar el where. */
export type FilterCast = 'string' | 'int' | 'float' | 'boolean' | 'date';

/**
 * Constrainsts extra aplicadas dentro de un `some` de relación to-many,
 * indexadas por el nombre del segmento (sin el `[]`).
 */
export type FilterScope = Record<string, Record<string, unknown>>;

interface WithScope {
  scope?: FilterScope;
}

/** Igualdad. Con varias ocurrencias del mismo param se convierte en `in`. */
export interface ExactFilterDef extends WithScope {
  type: 'exact';
  field: string;
  cast?: FilterCast;
}

/** `ILIKE %valor%`. Solo para columnas de texto. */
export interface IcontainsFilterDef extends WithScope {
  type: 'icontains';
  field: string;
}

/**
 * Booleano. El frontend normaliza `"Si"/"No"` → `True/False` antes de mandar
 * (`filterable_table_state.get_filters()`), y httpx los serializa como
 * `true`/`false`. Igual se aceptan las otras formas por robustez.
 */
export interface BooleanFilterDef extends WithScope {
  type: 'boolean';
  field: string;
}

/**
 * Rango de fechas. Genera `<key>_after` (>=) y `<key>_before` (<).
 *
 * El límite superior es EXCLUSIVO a propósito: el dashboard manda el día
 * siguiente como `_before` para incluir el día completo — ver el comentario
 * "treated as upper bound" en `states/index/index_payment_state.py:27`.
 */
export interface DateRangeFilterDef extends WithScope {
  type: 'daterange';
  field: string;
}

/** Rango numérico. Genera `<key>` (=), `<key>_min` (>=) y `<key>_max` (<=). */
export interface NumRangeFilterDef extends WithScope {
  type: 'numrange';
  field: string;
  cast?: 'int' | 'float';
}

/** Relación a contar en un `countrange`. */
export interface CountRelationDef {
  /** Tabla física de la relación (ej. `direcciones`). */
  table: string;
  /** Columna FK que apunta a la entidad filtrada (ej. `cliente_id`). */
  groupBy: string;
  /** Columna PK de la entidad filtrada sobre la que se aplica el `in`. */
  targetField?: string;
}

/**
 * Rango sobre el CONTEO de una relación (ej. `cantidad_direcciones_min/max`).
 *
 * Prisma no sabe filtrar por `_count` en el `where`, así que el engine no lo
 * resuelve solo: lo devuelve como descriptor en `FilterResult.counts` y
 * `resolveCountFilters()` lo traduce a una subconsulta `GROUP BY … HAVING`.
 */
export interface CountRangeFilterDef {
  type: 'countrange';
  relation: CountRelationDef;
}

/**
 * Igualdad atravesando relaciones. Idéntico a `exact` con una ruta con puntos
 * —se mantiene como tipo propio porque hace evidente en el mapa cuáles
 * filtros implican un join.
 */
export interface RelationFilterDef extends WithScope {
  type: 'relation';
  path: string;
  cast?: FilterCast;
}

/** `NOT IN`. Con un solo valor equivale a `!=`. */
export interface ExcludeFilterDef extends WithScope {
  type: 'exclude';
  path: string;
  cast?: FilterCast;
}

/** `!=` sobre un único valor (`estado__not`). */
export interface NotFilterDef extends WithScope {
  type: 'not';
  field: string;
  cast?: FilterCast;
}

/** Búsqueda libre: `OR` de `icontains` sobre varios campos. */
export interface SearchFilterDef extends WithScope {
  type: 'search';
  fields: string[];
}

/**
 * Filtro que no corresponde a ninguna columna (`cliente_existe` →
 * `cliente_id IS NOT NULL`). `apply` recibe el valor ya casteado y devuelve el
 * fragmento de `where`, o `null` para no aplicar nada.
 */
export interface ComputedFilterDef {
  type: 'computed';
  cast?: FilterCast;
  apply: (value: unknown) => Record<string, unknown> | null;
}

export type FilterDef =
  | ExactFilterDef
  | IcontainsFilterDef
  | BooleanFilterDef
  | DateRangeFilterDef
  | NumRangeFilterDef
  | CountRangeFilterDef
  | RelationFilterDef
  | ExcludeFilterDef
  | NotFilterDef
  | SearchFilterDef
  | ComputedFilterDef;

/** Declaración completa de los filtros de una entidad. */
export type FilterMap = Record<string, FilterDef>;

/** Query crudo tal como lo entrega Express (`req.query`). */
export type RawQuery = Record<string, unknown>;

/** Petición de filtro por conteo, pendiente de resolver con SQL. */
export interface CountFilterRequest {
  relation: Required<CountRelationDef>;
  equals?: number;
  min?: number;
  max?: number;
}

export interface FilterResult {
  /**
   * `where` de Prisma. Siempre con forma `{ AND: [...] }` (o `{}` si no hay
   * filtros): acumular cada cláusula por separado evita tener que hacer merge
   * profundo cuando dos filtros tocan el mismo campo (`_min` y `_max`) o la
   * misma relación (`sector_sector` y `zona_zona`).
   */
  where: Record<string, unknown>;
  /** Filtros por conteo que hay que resolver con `resolveCountFilters()`. */
  counts: CountFilterRequest[];
}
