import { Module } from '@nestjs/common';

import { TransferenciasController } from './transferencias.controller';
import { TransferenciasService } from './transferencias.service';

/** Fase 8. Listado + el único write de la pantalla: asignar cliente. */
@Module({
  controllers: [TransferenciasController],
  providers: [TransferenciasService],
})
export class TransferenciasModule {}
