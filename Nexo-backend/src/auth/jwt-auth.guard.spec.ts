import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthService } from './auth.service';
import { ACCESS_TOKEN, AuthenticatedUser, JwtPayload } from './auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';

/**
 * ============================================================================
 * Unit del guard: parseo del header y política de rechazo.
 * ----------------------------------------------------------------------------
 * La verificación real del token la cubre `auth.integration.spec.ts` sobre
 * HTTP; acá el `AuthService` es un doble para poder probar los bordes sin
 * firmar tokens de verdad.
 * ============================================================================
 */

const PAYLOAD: JwtPayload = {
  token_type: 'access',
  user_id: 7,
  username: 'admin',
  is_staff: true,
  jti: 'jti-1',
  iat: 0,
  exp: 0,
};

class ControladorProtegido {
  handler(): void {}
}

@Public()
class ControladorPublico {
  handler(): void {}
}

interface RequestDouble {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

function contextoDe(
  request: RequestDouble,
  controlador: new () => { handler(): void } = ControladorProtegido,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => controlador.prototype.handler,
    getClass: () => controlador,
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let decode: jest.Mock;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    decode = jest.fn().mockResolvedValue(PAYLOAD);
    guard = new JwtAuthGuard(new Reflector(), {
      decode,
    } as unknown as AuthService);
  });

  describe('rutas públicas', () => {
    it('`@Public()` pasa sin token y sin verificar nada', async () => {
      const contexto = contextoDe({ headers: {} }, ControladorPublico);

      await expect(guard.canActivate(contexto)).resolves.toBe(true);
      expect(decode).not.toHaveBeenCalled();
    });
  });

  describe('token válido', () => {
    it('deja el usuario en `request.user`', async () => {
      const request: RequestDouble = {
        headers: { authorization: 'Bearer abc.def.ghi' },
      };

      await expect(guard.canActivate(contextoDe(request))).resolves.toBe(true);
      expect(request.user).toEqual({ id: 7, username: 'admin', is_staff: true });
    });

    it('exige que el token sea de tipo `access`', async () => {
      await guard.canActivate(
        contextoDe({ headers: { authorization: 'Bearer abc.def.ghi' } }),
      );

      expect(decode).toHaveBeenCalledWith('abc.def.ghi', ACCESS_TOKEN);
    });

    it('acepta el esquema en cualquier capitalización', async () => {
      const contexto = contextoDe({ headers: { authorization: 'bearer t' } });

      await expect(guard.canActivate(contexto)).resolves.toBe(true);
    });

    it('tolera espacios de más alrededor', async () => {
      const contexto = contextoDe({ headers: { authorization: '  Bearer   t  ' } });

      await expect(guard.canActivate(contexto)).resolves.toBe(true);
    });
  });

  describe('rechazos — siempre 401, nunca 403', () => {
    // Si alguno de estos devolviera `false`, Nest respondería 403 y el
    // auto-refresh del frontend no se dispararía (ROADMAP §3.3).
    const headersInvalidos: Array<[string, Record<string, unknown>]> = [
      ['sin header', {}],
      ['header vacío', { authorization: '' }],
      ['sin el esquema Bearer', { authorization: 'abc.def.ghi' }],
      ['con otro esquema', { authorization: 'Basic YWRtaW46YWRtaW4=' }],
      ['Bearer sin token', { authorization: 'Bearer' }],
      ['con basura después del token', { authorization: 'Bearer a b' }],
      ['header repetido (array)', { authorization: ['Basic x', 'Bearer y'] }],
    ];

    it.each(headersInvalidos)('%s → 401', async (_caso, headers) => {
      const contexto = contextoDe({ headers } as RequestDouble);

      await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(decode).not.toHaveBeenCalled();
    });

    it('propaga el 401 del servicio cuando el token no verifica', async () => {
      decode.mockRejectedValue(new UnauthorizedException('El token es inválido o expiró.'));
      const contexto = contextoDe({ headers: { authorization: 'Bearer roto' } });

      await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
