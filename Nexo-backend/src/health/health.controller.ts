import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';

import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * `GET /api/health` — contrato heredado de la Fase 0. De él dependen el
 * `healthcheck` de docker-compose y el `depends_on: service_healthy` del
 * frontend, así que la forma de la respuesta y los códigos no se tocan:
 *
 *   200 → {"status":"ok","db":"ok"}
 *   503 → {"status":"degraded","db":"error"}
 *
 * Público (`@Public()`): el `healthcheck` de compose corre `curl` sin token, y
 * si esta ruta pidiera autenticación el contenedor nunca llegaría a `healthy`
 * y el frontend se quedaría esperando en su `depends_on`.
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const dbOk = await this.prisma.isHealthy();

    res
      .status(dbOk ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({
        status: dbOk ? 'ok' : 'degraded',
        service: 'nexo-backend',
        db: dbOk ? 'ok' : 'error',
      });
  }
}
