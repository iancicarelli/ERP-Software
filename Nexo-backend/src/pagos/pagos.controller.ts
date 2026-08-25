import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';

import {
  accionNoSoportada,
  BulkActionDto,
  comoAdjunto,
  CSV_CONTENT_TYPE,
  nombreConFecha,
  paginated,
  Pagination,
  PaginationParams,
  RawQuery,
} from '../common';
import { PagosService } from './pagos.service';

/**
 * ============================================================================
 * `/api/pagos/` — Fase 8
 * ----------------------------------------------------------------------------
 * | Ruta | Método | Status | Consumido por |
 * |------|--------|--------|---------------|
 * | `/pagos/` | GET | 200 | `PaymentTableState`, `IndexPaymentState` (dashboard) |
 * | `/pagos/all-ids/` | GET | 200 | selección masiva (`trigger_select_all`) |
 * | `/pagos/bulk-action/` | POST | **200** | suma y export CSV (Fase 9) |
 *
 * **Sin POST, PUT ni DELETE de entidad** (D10): los pagos entran por ingesta,
 * no por formulario. Ver la cabecera de `pagos.service.ts`. El único POST es
 * `bulk-action`, que no escribe nada: lee y devuelve.
 *
 * No hay `GET /pagos/{id}/`: no existe pantalla de detalle de un pago, así que
 * tampoco existe la ruta. Por eso acá `all-ids` no necesita ir antes que
 * ningún `:id` — es la única ruta con segmento, pero se deja arriba igual para
 * que el orden no sorprenda a quien agregue el detalle mañana.
 * ============================================================================
 */
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @Get()
  async listar(@Query() query: RawQuery, @Pagination() pagina: PaginationParams) {
    const [count, resultados] = await this.pagos.listar(query, pagina);
    return paginated(count, resultados);
  }

  @Get('all-ids')
  async todosLosIds(@Query() query: RawQuery) {
    return { ids: await this.pagos.todosLosIds(query) };
  }

  /**
   * `POST /api/pagos/bulk-action/` — ROADMAP §3.9.
   *
   * **200, no el 201 que Nest pone por default a los POST**: el frontend
   * compara contra 200 exacto. Ver la nota extendida en
   * `clientes.controller.ts`, que es el mismo patrón para las cuatro entidades.
   */
  @Post('bulk-action')
  @HttpCode(HttpStatus.OK)
  async bulkAction(
    @Body() dto: BulkActionDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, unknown> | StreamableFile> {
    switch (dto.action) {
      case 'sumar_pagos':
        return this.pagos.sumar(dto.selected_ids);

      case 'exportar_pagos_csv':
        comoAdjunto(res, nombreConFecha('pagos', 'csv'), CSV_CONTENT_TYPE);
        return new StreamableFile(this.pagos.exportarCsv(dto.selected_ids));

      default:
        throw accionNoSoportada(dto.action);
    }
  }
}
