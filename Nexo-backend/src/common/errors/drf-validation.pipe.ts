import { ValidationError, ValidationPipe } from '@nestjs/common';

import { DrfFieldErrors, DrfValidationException } from './drf-validation.exception';

/**
 * `ValidationPipe` global con el `exceptionFactory` que reformatea al shape de
 * DRF.
 *
 * Por defecto Nest devuelve `{message: [...], error, statusCode}`, que
 * `_parse_error_response()` mostraría como `message: rut no puede estar vacío`
 * — con la clave equivocada y todos los campos mezclados en una sola lista.
 */
export function createDrfValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    // Descarta propiedades no declaradas en el DTO en vez de rechazar la
    // request: el frontend manda campos de más en varios PUT (los `*_str`
    // denormalizados vuelven en el payload tal como llegaron).
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new DrfValidationException(flattenValidationErrors(errors)),
  });
}

/**
 * Aplana el árbol de `ValidationError` a `campo → mensajes`.
 *
 * Los errores anidados se reportan con la ruta en notación de puntos
 * (`direccion.sector`), que es también lo que hace DRF con serializers
 * anidados.
 */
export function flattenValidationErrors(
  errors: ValidationError[],
  prefix = '',
): DrfFieldErrors {
  const flattened: DrfFieldErrors = {};

  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;

    if (error.constraints) {
      const messages = Object.values(error.constraints);
      flattened[path] = [...(flattened[path] ?? []), ...messages];
    }

    if (error.children && error.children.length > 0) {
      for (const [childPath, messages] of Object.entries(
        flattenValidationErrors(error.children, path),
      )) {
        flattened[childPath] = [...(flattened[childPath] ?? []), ...messages];
      }
    }
  }

  return flattened;
}
