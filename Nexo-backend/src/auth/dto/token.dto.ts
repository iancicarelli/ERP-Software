import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Cuerpos de los tres endpoints de `/api/token/*` (ROADMAP §3.3).
 *
 * Los tres validan con el `ValidationPipe` global, así que un body incompleto
 * responde 400 con forma DRF (`{"username": ["…"]}`) — no 401. El frontend
 * trata cualquier status ≠ 200 como "credenciales incorrectas", así que la
 * distinción es para quien depure con curl, no para la UI.
 */

export class TokenObtainDto {
  @IsString({ message: 'Este campo debe ser un texto.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  username: string;

  @IsString({ message: 'Este campo debe ser un texto.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  password: string;
}

export class TokenRefreshDto {
  @IsString({ message: 'Este campo debe ser un texto.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  refresh: string;
}

export class TokenVerifyDto {
  @IsString({ message: 'Este campo debe ser un texto.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  token: string;
}
