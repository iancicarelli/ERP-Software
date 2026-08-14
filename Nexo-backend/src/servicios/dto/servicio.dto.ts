import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

/**
 * ============================================================================
 * Cuerpo de `POST /api/servicios/` y `PUT /api/servicios/{id}/` — Fase 6
 * ----------------------------------------------------------------------------
 * FUENTE: los `post_payload` / `put_payload` de `ServiceDetailState`
 * (`states/service/service_detail_state.py`). Los dos mandan exactamente las
 * mismas siete claves:
 *
 *   { activo, cantidad, monto, personalizado, elemento, direccion, cliente }
 *
 * **Un solo DTO para POST y PUT**, igual que en clientes: el PUT de DRF es un
 * reemplazo completo y el frontend manda el payload entero en ambos casos.
 *
 * No están declarados `cliente_rut`, `cliente_str`, `direccion_str` ni
 * `elemento_elemento`: son etiquetas de solo lectura que el serializer deriva.
 * El frontend no las manda hoy, pero si algún día reenvía el objeto entero
 * —como hace clientes— el `whitelist: true` del `ValidationPipe` global las
 * descarta en silencio, sin romper el guardado.
 * ============================================================================
 */
export class ServicioWriteDto {
  /**
   * FK obligatoria. El frontend valida `cliente != 0` antes de mandar
   * (`add_entity`), así que un 0 acá es un cliente sin resolver, no un id.
   */
  @IsInt({ message: 'Este campo debe ser un número entero.' })
  @Min(1, { message: 'Debe seleccionar un cliente.' })
  cliente: number;

  @IsInt({ message: 'Este campo debe ser un número entero.' })
  @Min(1, { message: 'Debe seleccionar un elemento.' })
  elemento: number;

  /**
   * Opcional en la base (`direccion_id Int?`) aunque el frontend hoy exija
   * elegir una. Se acepta ausente o 0 → se guarda `null`; un servicio puede
   * quedarse sin dirección si la borran (`onDelete: SetNull`), y el PUT que
   * venga después no tiene por qué inventar una.
   */
  @IsOptional()
  @IsInt({ message: 'Este campo debe ser un número entero.' })
  @Min(0, { message: 'Dirección inválida.' })
  direccion?: number;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  activo?: boolean;

  /**
   * La migración `init` tiene el CHECK `ck_servicios_cantidad_positiva
   * (cantidad > 0)`. Sin este `@Min(1)` el rechazo llegaría como un P2010 sin
   * traducir, que el filtro global reporta como 500 en vez de 400.
   */
  @IsOptional()
  @IsInt({ message: 'Este campo debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser mayor a cero.' })
  cantidad?: number;

  /**
   * Montos en CLP como entero (D5). Solo se respeta si `personalizado` es
   * `true`; ver `resolverMonto()` en el servicio.
   */
  @IsOptional()
  @IsInt({ message: 'Este campo debe ser un número entero.' })
  @Min(0, { message: 'El monto no puede ser negativo.' })
  monto?: number;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  personalizado?: boolean;
}
