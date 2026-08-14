import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * ============================================================================
 * Cuerpo de `POST /api/ordenes/` y `PUT /api/ordenes/{id}/` — Fase 7
 * ----------------------------------------------------------------------------
 * FUENTE: el `post_payload` de `OrdersAddState.add_entity()` y el `put_payload`
 * de `OrderDetailState.save_entity()` (`states/work_orders/`). Los dos mandan
 * exactamente las mismas claves, así que **un solo DTO**, como en clientes y
 * servicios.
 *
 * ── Lo que NO está acá, y es lo importante ──
 * **`cliente` no se declara porque el frontend nunca lo manda.** Ni el POST ni
 * el PUT tienen esa clave: mandan `rut`, `nombre1` y `apellido1` como texto
 * libre. El vínculo con la ficha del cliente lo resuelve el backend por RUT
 * (D9) — ver `OrdenesService.resolverClienteId()`.
 *
 * Tampoco están las etiquetas derivadas (`estado_str`, `zona_zona`,
 * `servicio_servicio`, `tecnico_str`…): son de solo lectura. Si algún día el
 * frontend reenvía el objeto entero —como hace clientes—, el `whitelist: true`
 * del `ValidationPipe` las descarta sin romper el guardado.
 *
 * ── Las FK viajan con el nombre plano ──
 * `servicio`, `estado`, `causa`, `zona`, `sector`, `vendedor`, `tecnico` son
 * ids, no etiquetas, y acá se traducen a `*_id`. `tecnico2` es la excepción:
 * es TEXTO, no una FK, tal como lo declara `OrderDetailDTO.tecnico2`.
 * ============================================================================
 */
export class OrdenWriteDto {
  // ── Cliente: snapshot obligatorio (D9) ────────────────────────────────────
  // El frontend valida los tres antes de mandar (`add_entity` corta con un
  // toast si `rut` o `nombre1` están vacíos), pero un cliente de la API que no
  // sea el frontend tiene que recibir el mismo rechazo.
  // Los `@MaxLength` replican el ancho de las columnas. Sin ellos, un texto
  // largo llega a Postgres y vuelve como P2000 → 500, en vez de un 400 que le
  // diga al usuario qué campo recortar.
  @IsString({ message: 'Este campo debe ser un texto.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  @MaxLength(20, { message: 'Máximo 20 caracteres.' })
  rut: string;

  @IsString({ message: 'Este campo debe ser un texto.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  @MaxLength(80, { message: 'Máximo 80 caracteres.' })
  nombre1: string;

  @IsString({ message: 'Este campo debe ser un texto.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  @MaxLength(80, { message: 'Máximo 80 caracteres.' })
  apellido1: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(80, { message: 'Máximo 80 caracteres.' })
  apellido2?: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(254, { message: 'Máximo 254 caracteres.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(30, { message: 'Máximo 30 caracteres.' })
  tel?: string;

  // ── Kobo ──────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  koboid?: number | null;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  koboid_serie?: number | null;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(64, { message: 'Máximo 64 caracteres.' })
  kobo_asset_uid?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Debe ser una fecha válida.' })
  kobo_submission_time?: string | null;

  // ── Contrato / tipo de orden ──────────────────────────────────────────────
  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  contrato_nuevo?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Debe ser una fecha con formato AAAA-MM-DD.' })
  fecha_contrato?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  modificacion_plan?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  migracion?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  traslado?: boolean;

  // ── FKs (nombre plano) ────────────────────────────────────────────────────
  // Todas opcionales y nullables: el frontend manda `... or None` en cada una,
  // y `causa` directamente omite la clave cuando no hay causa elegida.
  @IsOptional()
  @IsInt({ message: 'Debe seleccionar un servicio.' })
  @Min(1, { message: 'Debe seleccionar un servicio.' })
  servicio?: number | null;

  @IsOptional()
  @IsInt({ message: 'Debe seleccionar un estado.' })
  @Min(1, { message: 'Debe seleccionar un estado.' })
  estado?: number | null;

  @IsOptional()
  @IsInt({ message: 'Debe seleccionar una causa.' })
  @Min(1, { message: 'Debe seleccionar una causa.' })
  causa?: number | null;

  @IsOptional()
  @IsInt({ message: 'Debe seleccionar una zona.' })
  @Min(1, { message: 'Debe seleccionar una zona.' })
  zona?: number | null;

  @IsOptional()
  @IsInt({ message: 'Debe seleccionar un sector.' })
  @Min(1, { message: 'Debe seleccionar un sector.' })
  sector?: number | null;

  @IsOptional()
  @IsInt({ message: 'Debe seleccionar un vendedor.' })
  @Min(1, { message: 'Debe seleccionar un vendedor.' })
  vendedor?: number | null;

  @IsOptional()
  @IsInt({ message: 'Debe seleccionar un técnico.' })
  @Min(1, { message: 'Debe seleccionar un técnico.' })
  tecnico?: number | null;

  /** TEXTO, no FK — así lo manda el PUT y así lo declara el DTO del frontend. */
  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(160, { message: 'Máximo 160 caracteres.' })
  tecnico2?: string;

  // ── Equipamiento ──────────────────────────────────────────────────────────
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(0, { message: 'No puede ser negativo.' })
  anexos_extras?: number;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(0, { message: 'No puede ser negativo.' })
  anexos_extras_exterior?: number;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(0, { message: 'No puede ser negativo.' })
  sintonizadores?: number;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(0, { message: 'No puede ser negativo.' })
  extensores_wifi?: number;

  // ── Costos (enteros por D5: CLP no tiene centavos) ────────────────────────
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(0, { message: 'No puede ser negativo.' })
  metros_extras?: number;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(0, { message: 'No puede ser negativo.' })
  costo_metros_extras?: number;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  pago_instalacion?: boolean;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(0, { message: 'No puede ser negativo.' })
  costo_instalacion?: number;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(0, { message: 'No puede ser negativo.' })
  monto?: number;

  // ── Ubicación / instalación ───────────────────────────────────────────────
  /**
   * Texto libre, sin `@MaxLength`: la columna es `String` sin `@db.VarChar`,
   * o sea `text` en Postgres. La FK `direccion_id` no la escribe el frontend.
   */
  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  direccion?: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(80, { message: 'Máximo 80 caracteres.' })
  coordenadas?: string;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  medidor_luz?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  ducto?: boolean;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(0, { message: 'No puede ser negativo.' })
  metros_ducto?: number;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  poda?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  vecino?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  postacion?: boolean;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(0, { message: 'No puede ser negativo.' })
  postes?: number;

  // ── Observaciones ─────────────────────────────────────────────────────────
  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  observacion_vendedor?: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  observacion?: string;

  // ── Estado ────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  abierto?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  evaluacion?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  bienvenida?: boolean;

  // ── Comisión ──────────────────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  comision?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  comision_pagada?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Debe ser una fecha con formato AAAA-MM-DD.' })
  fecha_pago?: string | null;

  // ── Fechas de gestión ─────────────────────────────────────────────────────
  // `fecha_programado` llega de un `datetime-local` (`"2026-08-11T14:30"`) y
  // `fecha_instalado` de un `date`. `@IsDateString()` acepta las dos formas.
  @IsOptional()
  @IsDateString({}, { message: 'Debe ser una fecha válida.' })
  fecha_programado?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'Debe ser una fecha válida.' })
  fecha_instalado?: string | null;
}
