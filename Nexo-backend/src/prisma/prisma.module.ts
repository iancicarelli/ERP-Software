import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global para que cada módulo de entidad (Fases 4a en adelante) pueda inyectar
 * `PrismaService` sin reimportar este módulo en cada uno.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
