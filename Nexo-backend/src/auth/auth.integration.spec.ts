import {
  Controller,
  Get,
  Global,
  INestApplication,
  Logger,
  Module,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { configureDrfLayer } from '../common/drf-layer';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from './auth.module';
import { AuthenticatedUser, JwtPayload } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { hashPassword } from './password';
import { Public } from './public.decorator';

/**
 * ============================================================================
 * Test de integración del auth sobre HTTP real — Fase 3
 * ----------------------------------------------------------------------------
 * Monta el `AuthModule` de verdad (guard global incluido) sobre la misma
 * `configureDrfLayer()` de `main.ts`, con un `PrismaService` de mentira y dos
 * controladores descartables: uno protegido y uno `@Public()`.
 *
 * Lo que se verifica es el contrato del ROADMAP §3.3, que es lo que el
 * frontend ya implementa:
 *   - status 200 exacto en los tres endpoints de `/token/` (no el 201 de Nest),
 *   - `{access, refresh}` y `{access}` como cuerpos,
 *   - claim `exp` presente (el frontend lo decodifica solo),
 *   - **401 y nunca 403** ante token ausente, inválido, expirado o del tipo
 *     equivocado — de eso depende el auto-refresh.
 * ============================================================================
 */

const PASSWORD_ADMIN = 'clave-de-prueba';
const SECRETO = 'secreto-de-test-largo-y-aburrido';

interface UsuarioFalso {
  id: number;
  username: string;
  password: string;
  is_active: boolean;
  is_staff: boolean;
}

const usuarios: UsuarioFalso[] = [];

const prismaFalso = {
  usuario: {
    findUnique: ({ where }: { where: { username?: string; id?: number } }) =>
      Promise.resolve(
        usuarios.find(
          (u) =>
            (where.username !== undefined && u.username === where.username) ||
            (where.id !== undefined && u.id === where.id),
        ) ?? null,
      ),
  },
};

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: prismaFalso }],
  exports: [PrismaService],
})
class PrismaFalsoModule {}

@Controller('privado')
class PrivadoController {
  @Get()
  yo(@CurrentUser() user: AuthenticatedUser | undefined) {
    return { username: user?.username ?? null, is_staff: user?.is_staff ?? null };
  }
}

@Public()
@Controller('abierto')
class AbiertoController {
  @Get()
  ok() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Sin esto, un `.env` del desarrollador podría pisar el secreto de test.
      ignoreEnvFile: true,
      load: [
        () => ({
          JWT_SECRET: SECRETO,
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        }),
      ],
    }),
    PrismaFalsoModule,
    AuthModule,
  ],
  controllers: [PrivadoController, AbiertoController],
})
class AppDeTestModule {}

describe('Autenticación JWT sobre HTTP', () => {
  jest.setTimeout(30_000); // argon2: ~40 ms por hash, y acá se hashea varias veces.

  let app: INestApplication;
  let baseUrl: string;
  let jwt: JwtService;

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const hash = await hashPassword(PASSWORD_ADMIN);
    usuarios.push(
      { id: 1, username: 'admin', password: hash, is_active: true, is_staff: true },
      { id: 2, username: 'dado_de_baja', password: hash, is_active: false, is_staff: false },
    );

    app = await NestFactory.create(AppDeTestModule, { logger: false });
    app.setGlobalPrefix('api');
    configureDrfLayer(app);

    await app.listen(0);
    baseUrl = await app.getUrl();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
    usuarios.length = 0;
    jest.restoreAllMocks();
  });

  // ── helpers ───────────────────────────────────────────────────────────────

  interface Cuerpo {
    access?: string;
    refresh?: string;
    detail?: string;
    username?: string[] | string | null;
    password?: string[];
    is_staff?: boolean | null;
    ok?: boolean;
  }

  const post = (path: string, body: unknown): Promise<Response> =>
    fetch(`${baseUrl}/api${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const get = (path: string, token?: string): Promise<Response> =>
    fetch(`${baseUrl}/api${path}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

  const cuerpoDe = async (res: Response): Promise<Cuerpo> =>
    (await res.json()) as Cuerpo;

  const login = async (
    username = 'admin',
    password = PASSWORD_ADMIN,
  ): Promise<{ access: string; refresh: string }> => {
    const body = await cuerpoDe(await post('/token/', { username, password }));
    return { access: body.access as string, refresh: body.refresh as string };
  };

  /**
   * Decodifica el payload sin verificar firma — exactamente lo que hace
   * `AuthState._decode_jwt_exp` en el frontend. Si esto se rompe, se rompe el
   * refresh preventivo de los 5 minutos.
   */
  const payloadDe = (token: string): JwtPayload =>
    JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
    ) as JwtPayload;

  // ── POST /api/token/ ──────────────────────────────────────────────────────

  describe('POST /api/token/', () => {
    it('credenciales válidas → 200 con `{access, refresh}`', async () => {
      const response = await post('/token/', {
        username: 'admin',
        password: PASSWORD_ADMIN,
      });
      const body = await cuerpoDe(response);

      // 200 exacto: el frontend compara `status_code == 200`, y Nest responde
      // 201 a los POST si no se le dice lo contrario.
      expect(response.status).toBe(200);
      expect(Object.keys(body).sort()).toEqual(['access', 'refresh']);
    });

    it('el access token lleva `exp` legible sin verificar firma', async () => {
      const { access, refresh } = await login();

      const ahora = Math.floor(Date.now() / 1000);
      expect(payloadDe(access).exp).toBeGreaterThan(ahora);
      // 15m de config, con margen para la latencia del test.
      expect(payloadDe(access).exp - ahora).toBeLessThanOrEqual(15 * 60);
      expect(payloadDe(refresh).exp - ahora).toBeGreaterThan(6 * 24 * 3600);
    });

    it('los claims imitan a SimpleJWT y distinguen el tipo', async () => {
      const { access, refresh } = await login();

      expect(payloadDe(access)).toMatchObject({
        token_type: 'access',
        user_id: 1,
        username: 'admin',
        is_staff: true,
      });
      expect(payloadDe(access).jti).toEqual(expect.any(String));
      expect(payloadDe(refresh).token_type).toBe('refresh');
    });

    it('contraseña incorrecta → 401 con `{detail}`', async () => {
      const response = await post('/token/', {
        username: 'admin',
        password: 'no-es',
      });

      expect(response.status).toBe(401);
      expect((await cuerpoDe(response)).detail).toEqual(expect.any(String));
    });

    it('usuario inexistente → 401', async () => {
      const response = await post('/token/', {
        username: 'nadie',
        password: PASSWORD_ADMIN,
      });

      expect(response.status).toBe(401);
    });

    it('usuario inactivo → 401 aunque la contraseña sea correcta', async () => {
      const response = await post('/token/', {
        username: 'dado_de_baja',
        password: PASSWORD_ADMIN,
      });

      expect(response.status).toBe(401);
    });

    it('el mensaje no distingue "no existe" de "contraseña mala"', async () => {
      const inexistente = await cuerpoDe(
        await post('/token/', { username: 'nadie', password: 'x' }),
      );
      const malaClave = await cuerpoDe(
        await post('/token/', { username: 'admin', password: 'x' }),
      );

      expect(inexistente.detail).toBe(malaClave.detail);
    });

    it('body incompleto → 400 con forma DRF `{campo: [mensajes]}`', async () => {
      const response = await post('/token/', { username: 'admin' });
      const body = await cuerpoDe(response);

      expect(response.status).toBe(400);
      expect(Object.keys(body)).toEqual(['password']);
      expect(Array.isArray(body.password)).toBe(true);
    });
  });

  // ── POST /api/token/refresh/ ──────────────────────────────────────────────

  describe('POST /api/token/refresh/', () => {
    it('refresh válido → 200 con `{access}` y nada más', async () => {
      const { refresh } = await login();

      const response = await post('/token/refresh/', { refresh });
      const body = await cuerpoDe(response);

      expect(response.status).toBe(200);
      expect(Object.keys(body)).toEqual(['access']);
      expect(payloadDe(body.access as string).token_type).toBe('access');
    });

    it('el access nuevo abre una ruta protegida', async () => {
      const { refresh } = await login();
      const { access } = await cuerpoDe(await post('/token/refresh/', { refresh }));

      expect((await get('/privado/', access)).status).toBe(200);
    });

    it('mandar un access token en vez de un refresh → 401', async () => {
      const { access } = await login();

      // Sin el chequeo de `token_type`, el access de 15 min serviría de refresh
      // y el vencimiento corto dejaría de significar algo.
      expect((await post('/token/refresh/', { refresh: access })).status).toBe(401);
    });

    it('token basura → 401', async () => {
      expect((await post('/token/refresh/', { refresh: 'no.es.jwt' })).status).toBe(
        401,
      );
    });

    it('si el usuario se desactiva, su refresh deja de servir', async () => {
      const { refresh } = await login();
      const admin = usuarios.find((u) => u.username === 'admin')!;

      admin.is_active = false;
      try {
        expect((await post('/token/refresh/', { refresh })).status).toBe(401);
      } finally {
        admin.is_active = true;
      }
    });
  });

  // ── POST /api/token/verify/ ───────────────────────────────────────────────

  describe('POST /api/token/verify/', () => {
    it('access válido → 200 con `{}`', async () => {
      const { access } = await login();

      const response = await post('/token/verify/', { token: access });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({});
    });

    it('acepta también el refresh, como SimpleJWT', async () => {
      const { refresh } = await login();

      expect((await post('/token/verify/', { token: refresh })).status).toBe(200);
    });

    it('token expirado → 401', async () => {
      const vencido = await jwt.signAsync(
        { token_type: 'access', user_id: 1, username: 'admin', is_staff: true, jti: 'x' },
        { expiresIn: '-10s' },
      );

      expect((await post('/token/verify/', { token: vencido })).status).toBe(401);
    });

    it('token firmado con otro secreto → 401', async () => {
      const ajeno = await new JwtService({ secret: 'otro-secreto-cualquiera' }).signAsync(
        { token_type: 'access', user_id: 1, username: 'admin', is_staff: true, jti: 'x' },
        { expiresIn: '15m' },
      );

      expect((await post('/token/verify/', { token: ajeno })).status).toBe(401);
    });
  });

  // ── Guard global ──────────────────────────────────────────────────────────

  describe('guard global', () => {
    it('ruta protegida con access válido → 200 y sabe quién pide', async () => {
      const { access } = await login();

      const response = await get('/privado/', access);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ username: 'admin', is_staff: true });
    });

    const rechazos: Array<[string, () => Promise<string | undefined>]> = [
      ['sin token', () => Promise.resolve(undefined)],
      ['token basura', () => Promise.resolve('no.es.jwt')],
      [
        'token expirado',
        () =>
          jwt.signAsync(
            { token_type: 'access', user_id: 1, username: 'admin', is_staff: true, jti: 'x' },
            { expiresIn: '-10s' },
          ),
      ],
      ['refresh token', async () => (await login()).refresh],
    ];

    // 401 y NO 403: un 403 no dispara `fetch_with_auth`, el usuario ve la
    // pantalla vacía y nunca se entera de que tenía que renovar el token.
    it.each(rechazos)('%s → 401, nunca 403', async (_caso, tokenDe) => {
      const response = await get('/privado/', await tokenDe());

      expect(response.status).toBe(401);
      expect((await cuerpoDe(response)).detail).toEqual(expect.any(String));
    });

    it('las rutas `@Public()` siguen abiertas', async () => {
      const response = await get('/abierto/');

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });

    it('`/api/token/` es público (si no, no habría forma de loguearse)', async () => {
      expect((await post('/token/', { username: 'admin', password: 'x' })).status).toBe(
        401, // 401 por credenciales, no por falta de token: el guard lo dejó pasar.
      );
    });
  });
});
