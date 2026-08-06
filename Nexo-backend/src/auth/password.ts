import { Algorithm, hash, verify } from '@node-rs/argon2';

/**
 * ============================================================================
 * Hash de contraseñas (argon2id) — Fase 3
 * ----------------------------------------------------------------------------
 * Funciones sueltas y no un `@Injectable()`: no dependen de nada del contenedor
 * de Nest y el seed de Prisma (`prisma/seed.ts`) corre FUERA de la app, así que
 * necesita importarlas directo. Mismo criterio que `common/pagination`.
 *
 * Se usa `@node-rs/argon2` y no el paquete `argon2` porque el stage `runtime`
 * del Dockerfile instala con `npm ci --omit=dev --ignore-scripts`: `argon2`
 * baja su binario en un `postinstall` (que ahí no corre) mientras que
 * `@node-rs/argon2` lo trae como optionalDependency precompilada por
 * plataforma. Con `argon2` la imagen de producción quedaría rota.
 * ============================================================================
 */

/**
 * Parámetros explícitos, no los defaults de la librería: así el costo del hash
 * no cambia solo al actualizar la dependencia. Son los mínimos que recomienda
 * OWASP para argon2id (19 MiB, 2 iteraciones, 1 hilo).
 */
const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

/** Devuelve el string PHC completo (`$argon2id$v=19$m=…`): lleva su propia sal. */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

/**
 * Nunca lanza: un hash corrupto, vacío o con otro formato (por ejemplo el
 * `pbkdf2_sha256$…` de Django, si alguna vez se migran usuarios) es
 * simplemente una credencial que no valida.
 *
 * No recibe `ARGON2_OPTIONS`: los parámetros con los que se generó el hash
 * viajan dentro del propio string PHC, así que subir el costo más adelante no
 * invalida los hashes viejos.
 */
export async function verifyPassword(
  hashed: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}

/**
 * Hash descartable contra el que verificar cuando el usuario NO existe.
 *
 * Sin esto, un login con usuario inexistente responde en ~0 ms y uno con
 * usuario real en ~40 ms: la diferencia alcanza para enumerar usuarios. Se
 * calcula una sola vez y en el primer uso, no al importar el módulo (el
 * arranque no tiene por qué pagar 40 ms por algo que quizá nunca se use).
 */
let dummyHash: Promise<string> | null = null;

export async function wastePasswordTime(plain: string): Promise<false> {
  dummyHash ??= hashPassword('nexo-usuario-inexistente');
  await verifyPassword(await dummyHash, plain);
  return false;
}
