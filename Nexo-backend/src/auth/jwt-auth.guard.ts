import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthService } from './auth.service';
import { ACCESS_TOKEN, AuthenticatedUser } from './auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';

interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

/**
 * ============================================================================
 * Guard global de JWT — Fase 3
 * ----------------------------------------------------------------------------
 * Protege TODA la app salvo lo marcado con `@Public()` (`/api/token/*` y
 * `/api/health`).
 *
 * ⚠️ Nunca devuelve `false`: cuando un guard devuelve `false`, Nest lanza un
 * `ForbiddenException` (**403**) y el auto-refresh del frontend —que se dispara
 * únicamente con **401**— nunca correría (ROADMAP §3.3 y la nota de
 * `DrfExceptionFilter`). Por eso todos los caminos de rechazo lanzan
 * `UnauthorizedException` a mano.
 * ============================================================================
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearer(request.headers?.authorization);

    if (!token) {
      // Mismo texto que DRF cuando no llega el header. El frontend no lo
      // muestra, pero aparece en los logs y en curl.
      throw new UnauthorizedException(
        'Las credenciales de autenticación no se proveyeron.',
      );
    }

    // `ACCESS_TOKEN` explícito: un refresh token (7 días) no autoriza requests.
    const payload = await this.auth.decode(token, ACCESS_TOKEN);

    request.user = {
      id: payload.user_id,
      username: payload.username,
      is_staff: payload.is_staff,
    };

    return true;
  }
}

/**
 * `Authorization: Bearer <token>`. El esquema se compara sin distinguir
 * mayúsculas (httpx no lo normaliza y algún proxy podría reescribirlo).
 */
function extractBearer(header: string | string[] | undefined): string | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== 'string') return null;

  const [scheme, token, ...resto] = raw.trim().split(/\s+/);
  if (resto.length > 0) return null;
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
}
