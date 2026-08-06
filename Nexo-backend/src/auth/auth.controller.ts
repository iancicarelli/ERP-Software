import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AccessToken, TokenPair } from './auth.types';
import { TokenObtainDto, TokenRefreshDto, TokenVerifyDto } from './dto/token.dto';
import { Public } from './public.decorator';

/**
 * ============================================================================
 * `/api/token/*` — los tres endpoints de SimpleJWT (ROADMAP §3.3)
 * ----------------------------------------------------------------------------
 * `@Public()` a nivel de clase: es el único controlador al que se puede llegar
 * sin token, por definición.
 *
 * `@HttpCode(200)` en los tres: Nest responde 201 a los POST por defecto, y el
 * frontend compara contra 200 exacto en `do_login`, `do_refresh` y
 * `verify_token` — un 201 lo leería como "credenciales incorrectas".
 * ============================================================================
 */
@Public()
@Controller('token')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: TokenObtainDto): Promise<TokenPair> {
    return this.auth.login(dto.username, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: TokenRefreshDto): Promise<AccessToken> {
    return this.auth.refresh(dto.refresh);
  }

  /** Devuelve `{}`: al frontend solo le importa el status (200 vs 401). */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body() dto: TokenVerifyDto): Promise<Record<string, never>> {
    return this.auth.verify(dto.token);
  }
}
