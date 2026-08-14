import { Module } from '@nestjs/common';

import { NotasController } from './notas/notas.controller';
import { NotasService } from './notas/notas.service';
import { OrdenesController } from './ordenes.controller';
import { OrdenesService } from './ordenes.service';

/**
 * Fase 7. Las notas viven en este módulo y no en uno propio: `/notas-ordenes/`
 * no existe sin una orden (`orden_trabajo_id` es NOT NULL y el borrado va en
 * cascada), y la pantalla que las usa es el detalle de la orden.
 */
@Module({
  controllers: [OrdenesController, NotasController],
  providers: [OrdenesService, NotasService],
})
export class OrdenesModule {}
