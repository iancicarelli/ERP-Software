/**
 * ============================================================================
 * Bootstrap de Nexo Backend (NestJS) — Fase 1
 * ----------------------------------------------------------------------------
 * Reemplaza el servidor placeholder de la Fase 0. Lo único que se conserva de
 * aquel es el contrato de `GET /api/health`, del que dependen el healthcheck
 * de docker-compose y el `depends_on` del frontend.
 * ============================================================================
 */
import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { configureDrfLayer } from './common/drf-layer';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ── Prefijo global ────────────────────────────────────────────────────────
  // El frontend arma todo como `{API_BASE_URL}{endpoint}` con
  // API_BASE_URL=…/api → todas las rutas cuelgan de /api (ROADMAP §3.1).
  app.setGlobalPrefix('api');

  // ── Trailing slash ────────────────────────────────────────────────────────
  // El frontend SIEMPRE llama con slash final (`/api/clientes/`,
  // `/api/clientes/123/`). Con `strict routing` desactivado —el default de
  // Express— el slash final es opcional y `/api/clientes/` matchea el handler
  // declarado como `clientes`, sin redirect 301 de por medio (un 301 rompería
  // los POST/PUT, que pierden el body al seguir la redirección).
  // Se deja explícito para que nadie lo active por accidente.
  app.set('strict routing', false);

  // Paginación, validación y errores con forma DRF (Fase 2). Ver
  // `common/drf-layer.ts`.
  configureDrfLayer(app);

  // Necesario para que el cierre ordenado llegue a PrismaService.onModuleDestroy.
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');

  Logger.log(`Nexo backend escuchando en http://0.0.0.0:${port}/api`, 'Bootstrap');
}

void bootstrap();
