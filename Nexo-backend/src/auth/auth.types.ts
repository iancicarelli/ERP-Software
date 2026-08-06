/**
 * ============================================================================
 * Claims y tipos del JWT — Fase 3
 * ----------------------------------------------------------------------------
 * El payload imita el de SimpleJWT (`token_type`, `user_id`, `jti`) porque el
 * frontend viene de un backend Django y el contrato del ROADMAP §3.3 está
 * escrito contra esa forma. Lo único que el frontend LEE del token es `exp`
 * (`AuthState._decode_jwt_exp`), pero el resto se mantiene para que un token
 * de Nexo sea indistinguible de uno de SimpleJWT si algún día hay que
 * convivir con ambos.
 * ============================================================================
 */

/** `access` autoriza requests; `refresh` solo sirve para pedir otro `access`. */
export type TokenType = 'access' | 'refresh';

export const ACCESS_TOKEN: TokenType = 'access';
export const REFRESH_TOKEN: TokenType = 'refresh';

/** Claims propios. `iat` y `exp` los agrega `JwtService` al firmar. */
export interface JwtClaims {
  token_type: TokenType;
  user_id: number;
  username: string;
  /**
   * `is_staff` viaja en el token para no pegarle a la BD en cada request. La
   * contra: si a un usuario le sacan el flag, su access token sigue diciendo
   * `true` hasta que expire (~15 min). Para permisos sensibles, releer de la
   * BD en vez de confiar en el claim.
   */
  is_staff: boolean;
  /** Identificador único del token (SimpleJWT lo usa para blacklists). */
  jti: string;
}

/** Lo mismo, ya firmado y verificado: `JwtService` agrega los tiempos. */
export interface JwtPayload extends JwtClaims {
  iat: number;
  exp: number;
}

/**
 * Lo que el `JwtAuthGuard` deja en `request.user`. Se lee con `@CurrentUser()`.
 * Sale del token, no de la BD: no hay garantía de que el usuario siga
 * existiendo (ver la nota de `is_staff`).
 */
export interface AuthenticatedUser {
  id: number;
  username: string;
  is_staff: boolean;
}

/** Respuesta de `POST /api/token/` (ROADMAP §3.3). */
export interface TokenPair {
  access: string;
  refresh: string;
}

/** Respuesta de `POST /api/token/refresh/`. */
export interface AccessToken {
  access: string;
}
