import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import {
  DrfFieldErrors,
  DrfValidationException,
  isDrfFieldErrors,
} from './drf-validation.exception';

interface ResponseLike {
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
}

/**
 * ============================================================================
 * Filtro global de excepciones — respuestas con forma DRF (ROADMAP §3.4/§3.5)
 * ----------------------------------------------------------------------------
 * Dos formas posibles, las mismas que usa Django REST Framework:
 *
 *   400 → { "rut": ["Este campo es obligatorio."] }     (errores por campo)
 *   ***  → { "detail": "No encontrado." }                (todo lo demás)
 *
 * SOBRE EL 401 (§3.3): el auto-refresh del frontend se dispara con un 401, no
 * con un 403. Este filtro respeta el status de la excepción — NO convierte 403
 * en 401, porque eso enmascararía errores de autorización reales más adelante.
 * La responsabilidad es de la Fase 3: el `JwtAuthGuard` tiene que lanzar
 * `UnauthorizedException` (401) ante token ausente, inválido o expirado, y no
 * dejar que Nest caiga en el `ForbiddenException` (403) que tira por defecto
 * un guard que devuelve `false`.
 * ============================================================================
 */
@Catch()
export class DrfExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DrfExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<ResponseLike>();

    const { status, body } = this.toDrf(exception);
    response.status(status).json(body);
  }

  private toDrf(exception: unknown): {
    status: number;
    body: DrfFieldErrors | { detail: string };
  } {
    if (exception instanceof DrfValidationException) {
      return { status: HttpStatus.BAD_REQUEST, body: exception.errors };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // Un servicio puede lanzar `new BadRequestException({rut: ['Ya existe.']})`
      // para reportar un error por campo desde la lógica de negocio.
      if (isDrfFieldErrors(payload)) {
        return { status, body: payload };
      }

      return { status, body: { detail: detailFor(status, payload) } };
    }

    // Cualquier cosa no controlada es un bug: se loguea entera y hacia afuera
    // solo sale un mensaje genérico.
    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { detail: 'Error interno del servidor.' },
    };
  }
}

/** Mensajes en español para los status que el frontend puede llegar a mostrar. */
const DEFAULT_DETAILS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Solicitud inválida.',
  [HttpStatus.UNAUTHORIZED]: 'Las credenciales de autenticación no se proveyeron.',
  [HttpStatus.FORBIDDEN]: 'No tiene permiso para realizar esta acción.',
  [HttpStatus.NOT_FOUND]: 'No encontrado.',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'Método no permitido.',
  [HttpStatus.REQUEST_TIMEOUT]: 'La solicitud expiró.',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Error interno del servidor.',
};

/**
 * Mensajes que Nest genera solo y que no aportan nada al usuario: la frase en
 * inglés del status, y el `Cannot GET /ruta/` del 404 del router. Cuando el
 * mensaje es uno de estos se usa el del diccionario de arriba; cuando es un
 * texto propio (`throw new BadRequestException('El RUT ya existe')`) se respeta.
 */
const FRAMEWORK_MESSAGES = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Method Not Allowed',
  'Request Timeout',
  'Conflict',
  'Unprocessable Entity',
  'Internal Server Error',
]);

const ROUTER_404 = /^Cannot [A-Z]+ /;

function isFrameworkMessage(message: string): boolean {
  return FRAMEWORK_MESSAGES.has(message) || ROUTER_404.test(message);
}

function detailFor(status: number, payload: unknown): string {
  const fallback = DEFAULT_DETAILS[status] ?? 'Error.';

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed !== '' && !isFrameworkMessage(trimmed) ? trimmed : fallback;
  }

  if (payload !== null && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    if (typeof record.detail === 'string' && record.detail.trim() !== '') {
      return record.detail;
    }

    // Forma nativa de Nest: `{message, error, statusCode}`.
    const { message } = record;
    if (typeof message === 'string') {
      const trimmed = message.trim();
      if (trimmed !== '' && !isFrameworkMessage(trimmed)) return trimmed;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.map(String).join(' ');
    }
  }

  return fallback;
}
