import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * ============================================================================
 * Cuerpo de `POST /api/clientes/` y `PUT /api/clientes/{id}/` — Fase 5
 * ----------------------------------------------------------------------------
 * FUENTE: los `post_payload` / `put_payload` de `ClientAddState.add_entity()` y
 * `ClientDetailState.save_entity()`.
 *
 * **Un solo DTO para POST y PUT**, con los mismos campos obligatorios: en DRF
 * el PUT es un reemplazo completo (`partial=False`) y el frontend manda el
 * payload entero en los dos casos. El día que haga falta un PATCH parcial, va
 * como DTO aparte.
 *
 * NO están declarados `sector` ni `zona`, y es a propósito: el frontend los
 * manda en el payload (arrastra el objeto tal como lo recibió) pero por D4 son
 * DERIVADOS de la dirección principal. El `whitelist: true` del
 * `ValidationPipe` global los descarta en silencio, que es exactamente lo que
 * queremos — con `forbidNonWhitelisted` esto sería un 400 en cada guardado.
 *
 * Tampoco está `fecha_creacion`: la pone la base al crear y no se edita.
 * ============================================================================
 */
export class ClienteWriteDto {
  @IsString({ message: 'Este campo debe ser un texto.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  @MaxLength(20, { message: 'Máximo 20 caracteres.' })
  rut: string;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  rut_validado?: boolean;

  @IsString({ message: 'Este campo debe ser un texto.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  @MaxLength(80, { message: 'Máximo 80 caracteres.' })
  nombre1: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(80, { message: 'Máximo 80 caracteres.' })
  nombre2?: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(80, { message: 'Máximo 80 caracteres.' })
  nombre3?: string;

  @IsString({ message: 'Este campo debe ser un texto.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  @MaxLength(80, { message: 'Máximo 80 caracteres.' })
  apellido1: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(80, { message: 'Máximo 80 caracteres.' })
  apellido2?: string;

  // Sin `@IsEmail()`: el frontend manda `""` cuando está vacío y los datos
  // heredados del sistema viejo no están validados. Un correo mal escrito no
  // puede impedir guardar el resto de la ficha.
  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(254, { message: 'Máximo 254 caracteres.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(30, { message: 'Máximo 30 caracteres.' })
  tel?: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(160, { message: 'Máximo 160 caracteres.' })
  co_titular1?: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(160, { message: 'Máximo 160 caracteres.' })
  co_titular2?: string;

  // ── Estado comercial ─────────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  activo?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  por_instalar?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  moroso?: boolean;

  // `@IsOptional()` también deja pasar el `null` explícito que manda el
  // frontend cuando el campo de fecha está vacío.
  @IsOptional()
  @IsDateString({}, { message: 'Debe ser una fecha con formato AAAA-MM-DD.' })
  moroso_desde?: string | null;

  // Enteros por D5: el peso chileno no tiene centavos. El frontend los declara
  // `float` en su DTO y manda `0.0`, que en JSON es el entero 0.
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  deuda?: number;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  monto_total?: number;

  // ── Integraciones externas (se persisten; las integraciones no existen) ──
  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  krill?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  defontana?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  zammad?: boolean;

  // ── Equipos ──────────────────────────────────────────────────────────────
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  cpes_todos?: number;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  cpes_inactivos?: number;

  // ── Baja ─────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsDateString({}, { message: 'Debe ser una fecha con formato AAAA-MM-DD.' })
  fecha_de_baja?: string | null;

  /** ID de `causas_baja`. El frontend lo resuelve desde la etiqueta del select. */
  @IsOptional()
  @IsInt({ message: 'Debe ser el ID de una causa de baja.' })
  causa_de_baja?: number | null;

  // ── Marcas varias ────────────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  donacion?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  analogo?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  corte_poste?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  baja_por_renuncia?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  baja_por_morosidad?: boolean;
}
