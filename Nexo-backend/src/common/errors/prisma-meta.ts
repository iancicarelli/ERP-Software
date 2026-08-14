/**
 * ============================================================================
 * Lectura del `meta` de los errores conocidos de Prisma — Fase 6
 * ----------------------------------------------------------------------------
 * Los módulos de entidad traducen los errores de Prisma a la forma DRF
 * (`{campo: [mensajes]}`), y para eso necesitan saber QUÉ constraint falló.
 * Ese dato viaja en `error.meta`, cuya forma depende de la versión de Prisma:
 *
 *   Prisma 6 →  { modelName: 'Servicio', constraint: 'servicios_elemento_id_fkey' }
 *   Prisma 5 →  { field_name: 'servicios_elemento_id_fkey (index)' }
 *
 * Esto vive en `common/` y no en un módulo de entidad porque lo usan varios y
 * ninguno debería depender de otro.
 * ============================================================================
 */

/**
 * Nombre del constraint que falló en un P2003 (FK) o un P2002 (UNIQUE), o `""`
 * si el `meta` no lo trae.
 *
 * ⚠️ El proyecto venía leyendo `meta.field_name` a secas desde la Fase 5. Con
 * Prisma 6 esa clave no existe, así que la comparación daba siempre `""` y los
 * módulos culpaban al campo del `else`: un sector inexistente en
 * `POST /api/direcciones/` respondía "El cliente indicado no existe.".
 * Verificado a mano contra la base — las tres FK de `servicios` devuelven
 * `constraint` y ninguna `field_name`.
 */
export function nombreDelConstraint(meta: unknown): string {
  if (!meta || typeof meta !== 'object') return '';

  const { constraint, field_name } = meta as {
    constraint?: unknown;
    field_name?: unknown;
  };

  return String(constraint ?? field_name ?? '');
}
