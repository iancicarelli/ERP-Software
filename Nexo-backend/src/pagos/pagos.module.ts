import { Module } from '@nestjs/common';

import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

/** Fase 8. Solo lectura — ver `pagos.service.ts`. */
@Module({
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
