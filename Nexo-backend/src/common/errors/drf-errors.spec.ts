import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  ValidationError,
} from '@nestjs/common';
import { IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { DrfExceptionFilter } from './drf-exception.filter';
import {
  DrfValidationException,
  isDrfFieldErrors,
} from './drf-validation.exception';
import {
  createDrfValidationPipe,
  flattenValidationErrors,
} from './drf-validation.pipe';

/** Response de Express falso: guarda status y body. */
function fakeResponse() {
  const captured: { status?: number; body?: unknown } = {};
  const response = {
    status(code: number) {
      captured.status = code;
      return response;
    },
    json(body: unknown) {
      captured.body = body;
      return body;
    },
  };
  return { captured, host: { switchToHttp: () => ({ getResponse: () => response }) } };
}

function run(exception: unknown) {
  const { captured, host } = fakeResponse();
  new DrfExceptionFilter().catch(exception, host as never);
  return captured;
}

describe('isDrfFieldErrors', () => {
  it('reconoce `campo → lista de strings`', () => {
    expect(isDrfFieldErrors({ rut: ['Obligatorio.'] })).toBe(true);
  });

  it.each([
    [{}],
    [{ rut: 'Obligatorio.' }],
    [{ rut: [1, 2] }],
    [{ message: 'x', statusCode: 400 }],
    [null],
    [['a']],
  ])('rechaza %j', (value) => {
    expect(isDrfFieldErrors(value)).toBe(false);
  });
});

describe('flattenValidationErrors', () => {
  it('aplana un error simple a `campo → mensajes`', () => {
    const errors: ValidationError[] = [
      {
        property: 'rut',
        constraints: {
          isNotEmpty: 'Este campo es obligatorio.',
          isString: 'Debe ser texto.',
        },
      } as ValidationError,
    ];

    expect(flattenValidationErrors(errors)).toEqual({
      rut: ['Este campo es obligatorio.', 'Debe ser texto.'],
    });
  });

  it('usa notación de puntos para los errores anidados', () => {
    const errors: ValidationError[] = [
      {
        property: 'direccion',
        children: [
          {
            property: 'sector',
            constraints: { isInt: 'Debe ser un entero.' },
          } as ValidationError,
        ],
      } as ValidationError,
    ];

    expect(flattenValidationErrors(errors)).toEqual({
      'direccion.sector': ['Debe ser un entero.'],
    });
  });
});

describe('createDrfValidationPipe', () => {
  class DireccionDto {
    @IsInt()
    sector: number;
  }

  class ClienteDto {
    @IsString()
    @IsNotEmpty()
    rut: string;

    @ValidateNested()
    @Type(() => DireccionDto)
    direccion: DireccionDto;
  }

  const metadata = {
    type: 'body' as const,
    metatype: ClienteDto,
    data: '',
  };

  it('lanza el shape DRF, no el `{message, error, statusCode}` de Nest', async () => {
    const pipe = createDrfValidationPipe();

    await expect(
      pipe.transform({ rut: '', direccion: { sector: 'no-es-int' } }, metadata),
    ).rejects.toBeInstanceOf(DrfValidationException);

    const error = await pipe
      .transform({ rut: '', direccion: { sector: 'no-es-int' } }, metadata)
      .catch((err: DrfValidationException) => err);

    expect((error as DrfValidationException).errors).toEqual({
      rut: [expect.stringContaining('rut')],
      'direccion.sector': [expect.stringContaining('sector')],
    });
  });

  it('descarta las propiedades de más en vez de rechazar la request', async () => {
    // Varios PUT del frontend devuelven los `*_str` denormalizados tal como
    // llegaron; con `forbidNonWhitelisted` cada guardado daría 400.
    const pipe = createDrfValidationPipe();

    const result = await pipe.transform(
      { rut: '16.204.579-2', direccion: { sector: 3 }, sector_str: 'Centro' },
      metadata,
    );

    expect(result).toEqual({ rut: '16.204.579-2', direccion: { sector: 3 } });
  });
});

describe('DrfExceptionFilter', () => {
  // El filtro loguea los 500 enteros a propósito; acá solo ensucian la salida.
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('emite los errores de validación tal cual, con 400', () => {
    const captured = run(
      new DrfValidationException({ rut: ['Este campo es obligatorio.'] }),
    );

    expect(captured.status).toBe(HttpStatus.BAD_REQUEST);
    expect(captured.body).toEqual({ rut: ['Este campo es obligatorio.'] });
  });

  it('deja pasar los errores por campo lanzados desde un servicio', () => {
    const captured = run(new BadRequestException({ rut: ['Ya existe un cliente con ese RUT.'] }));

    expect(captured.status).toBe(HttpStatus.BAD_REQUEST);
    expect(captured.body).toEqual({ rut: ['Ya existe un cliente con ese RUT.'] });
  });

  it('traduce el 404 del router a `{detail}` en español', () => {
    // Nest devuelve `{message: "Cannot GET /api/clientes/", ...}`, que no le
    // sirve a nadie.
    const captured = run(new NotFoundException('Cannot GET /api/clientes/'));

    expect(captured.status).toBe(HttpStatus.NOT_FOUND);
    expect(captured.body).toEqual({ detail: 'No encontrado.' });
  });

  it('respeta el mensaje propio de una excepción', () => {
    const captured = run(new BadRequestException('El RUT no es válido.'));

    expect(captured.body).toEqual({ detail: 'El RUT no es válido.' });
  });

  it('devuelve 401 —no 403— para errores de autenticación', () => {
    // De esto depende el auto-refresh de `fetch_with_auth` (ROADMAP §3.3).
    const captured = run(new UnauthorizedException());

    expect(captured.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(captured.body).toEqual({
      detail: 'Las credenciales de autenticación no se proveyeron.',
    });
  });

  it('NO convierte un 403 en 401', () => {
    // Enmascararía errores de autorización reales. Es responsabilidad del
    // JwtAuthGuard de la Fase 3 lanzar UnauthorizedException.
    const captured = run(new ForbiddenException());

    expect(captured.status).toBe(HttpStatus.FORBIDDEN);
  });

  it('no filtra detalles internos en un 500', () => {
    const captured = run(new Error('connect ECONNREFUSED 10.0.0.5:5432'));

    expect(captured.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(captured.body).toEqual({ detail: 'Error interno del servidor.' });
  });

  it('tampoco los filtra si la excepción es un InternalServerErrorException', () => {
    const captured = run(new InternalServerErrorException());

    expect(captured.body).toEqual({ detail: 'Error interno del servidor.' });
  });

  it('siempre responde un objeto JSON, nunca un string suelto', () => {
    for (const exception of [
      new NotFoundException(),
      new BadRequestException(),
      new Error('boom'),
    ]) {
      const captured = run(exception);
      expect(typeof captured.body).toBe('object');
    }
  });
});
