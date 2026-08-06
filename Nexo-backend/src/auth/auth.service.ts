import { randomUUID } from 'node:crypto';

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_TOKEN,
  AccessToken,
  JwtClaims,
  JwtPayload,
  REFRESH_TOKEN,
  TokenPair,
  TokenType,
} from './auth.types';
import { verifyPassword, wastePasswordTime } from './password';

/**
 * ============================================================================
 * Emisión y validación de tokens — Fase 3
 * ----------------------------------------------------------------------------
 * Contrato (ROADMAP §3.3), calcado de SimpleJWT:
 *
 *   POST /api/token/          {username, password} → {access, refresh}
 *   POST /api/token/refresh/  {refresh}            → {access}
 *   POST /api/token/verify/   {token}              → {}
 *
 * TODO lo que falle acá es **401**, nunca 403: `fetch_with_auth()` del frontend
 * dispara el auto-refresh solo con 401 (§3.3). Con 403 el usuario vería
 * pantallas vacías sin entender por qué.
 * ============================================================================
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // `Expiracion` y no `string`: `jsonwebtoken` tipa `expiresIn` como un
  // literal `StringValue` de la librería `ms` ('15m', '7d', …), que no acepta
  // un `string` cualquiera. El valor viene de una variable de entorno, así que
  // el chequeo real es de Joi al arrancar, no del compilador.
  private readonly accessExpiresIn: Expiracion;
  private readonly refreshExpiresIn: Expiracion;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    // Los defaults ya los pone el schema de Joi (`config/env.validation.ts`);
    // los de acá solo cubren un ConfigService sin validar (tests).
    this.accessExpiresIn = config.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    ) as Expiracion;
    this.refreshExpiresIn = config.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    ) as Expiracion;
  }

  /** `POST /api/token/` — credenciales por par de tokens. */
  async login(username: string, password: string): Promise<TokenPair> {
    const usuario = await this.prisma.usuario.findUnique({ where: { username } });

    // Sin usuario igual se gasta el tiempo de un verify: si no, el tiempo de
    // respuesta delata qué usernames existen (ver `wastePasswordTime`).
    const valido = usuario
      ? await verifyPassword(usuario.password, password)
      : await wastePasswordTime(password);

    // Un usuario desactivado se trata igual que una credencial mala: no se le
    // dice al que prueba contraseñas que acertó pero la cuenta está apagada.
    if (!usuario || !valido || !usuario.is_active) {
      this.logger.warn(`Login fallido para "${username}"`);
      throw new UnauthorizedException(
        'No se encontró una cuenta activa con las credenciales proporcionadas.',
      );
    }

    return {
      access: await this.signAccess(usuario),
      refresh: await this.signRefresh(usuario),
    };
  }

  /**
   * `POST /api/token/refresh/` — refresh por access nuevo.
   *
   * Relee el usuario de la BD a propósito: es el único punto donde se puede
   * cortar el acceso a una cuenta dada de baja sin esperar los 7 días del
   * refresh. Es una request cada ~15 minutos por usuario, no un costo real.
   */
  async refresh(refreshToken: string): Promise<AccessToken> {
    const payload = await this.decode(refreshToken, REFRESH_TOKEN);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.user_id },
    });

    if (!usuario || !usuario.is_active) {
      throw new UnauthorizedException('El usuario ya no está activo.');
    }

    return { access: await this.signAccess(usuario) };
  }

  /**
   * `POST /api/token/verify/` — solo importa el status. Acepta los dos tipos de
   * token, igual que SimpleJWT: verifica firma y vencimiento, nada más.
   *
   * Es el camino de fallback del frontend (`verify_token` solo llega acá si no
   * pudo leer el `exp` localmente), así que a propósito NO toca la base.
   */
  async verify(token: string): Promise<Record<string, never>> {
    await this.decode(token);
    return {};
  }

  /**
   * Verifica firma y vencimiento y, si se pide, que el token sea del tipo
   * esperado. Lo usa también el `JwtAuthGuard`.
   *
   * El chequeo de `token_type` importa: sin él, un refresh token (7 días)
   * serviría como access token, y el vencimiento corto del access —que es toda
   * su razón de ser— dejaría de significar algo.
   */
  async decode(token: string, expected?: TokenType): Promise<JwtPayload> {
    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      // El motivo (firma inválida / expirado / malformado) queda adentro: al
      // cliente solo le sirve saber que tiene que renovar o volver a loguear.
      throw new UnauthorizedException('El token es inválido o expiró.');
    }

    if (expected && payload.token_type !== expected) {
      throw new UnauthorizedException(
        `Se esperaba un token de tipo "${expected}".`,
      );
    }

    return payload;
  }

  private signAccess(usuario: UsuarioClaims): Promise<string> {
    return this.sign(usuario, ACCESS_TOKEN, this.accessExpiresIn);
  }

  private signRefresh(usuario: UsuarioClaims): Promise<string> {
    return this.sign(usuario, REFRESH_TOKEN, this.refreshExpiresIn);
  }

  private sign(
    usuario: UsuarioClaims,
    token_type: TokenType,
    expiresIn: Expiracion,
  ): Promise<string> {
    const claims: JwtClaims = {
      token_type,
      user_id: usuario.id,
      username: usuario.username,
      is_staff: usuario.is_staff,
      jti: randomUUID(),
    };

    // `expiresIn` es lo que produce el claim `exp` que el frontend decodifica
    // para refrescar antes de tiempo (§3.3). Sin él, `_decode_jwt_exp` devuelve
    // None y el frontend cae al fallback de red en cada verificación.
    return this.jwt.signAsync(claims, { expiresIn });
  }
}

/** El tipo que `jsonwebtoken` acepta en `expiresIn` ('15m', 3600, …). */
type Expiracion = NonNullable<JwtSignOptions['expiresIn']>;

/** Lo mínimo del `Usuario` de Prisma que hace falta para firmar. */
interface UsuarioClaims {
  id: number;
  username: string;
  is_staff: boolean;
}
