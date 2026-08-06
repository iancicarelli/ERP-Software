import { BadRequestException } from '@nestjs/common';

/**
 * Errores de validación con la forma que espera el frontend (ROADMAP §3.4):
 *
 *   { "rut": ["Este campo es obligatorio."], "email": ["Formato inválido."] }
 *
 * Un dict `campo → lista de mensajes`. Así lo recorre
 * `GenericDetailState._parse_error_response()`, que arma el texto que ve el
 * usuario concatenando `campo: msg1, msg2`.
 */
export type DrfFieldErrors = Record<string, string[]>;

export class DrfValidationException extends BadRequestException {
  constructor(readonly errors: DrfFieldErrors) {
    super(errors);
  }
}

/** Errores que no pertenecen a ningún campo: DRF los manda bajo `detail`. */
export interface DrfDetail {
  detail: string;
}

/** ¿El objeto ya tiene la forma `campo → lista de mensajes`? */
export function isDrfFieldErrors(value: unknown): value is DrfFieldErrors {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  return (
    entries.length > 0 &&
    entries.every(
      ([, messages]) =>
        Array.isArray(messages) &&
        messages.every((message) => typeof message === 'string'),
    )
  );
}
