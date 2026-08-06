import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedUser } from './auth.types';

/**
 * Inyecta el usuario que dejó el `JwtAuthGuard` en la request.
 *
 * Solo tiene valor en rutas protegidas: en una `@Public()` devuelve
 * `undefined`, porque ahí el guard sale antes de mirar el token.
 *
 * Lo va a necesitar la Fase 7: `POST /api/notas-ordenes/` guarda `added_by` y
 * devuelve `added_by_username`, y ese dato sale de acá, no del payload.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined =>
    context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user,
);
