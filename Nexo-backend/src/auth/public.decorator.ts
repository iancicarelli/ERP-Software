import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'nexo:is_public';

/**
 * Excluye un handler (o un controlador entero) del `JwtAuthGuard` global.
 *
 * El guard es global y la lista de rutas públicas es corta y cerrada
 * (ROADMAP §5/Fase 3: solo `/token/*` y `/health`), así que el default es
 * "protegido" y abrir una ruta exige escribirlo explícitamente. Al revés
 * —lista blanca de rutas protegidas— cada entidad nueva nacería abierta si
 * alguien se olvida de anotarla.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
