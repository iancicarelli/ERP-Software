import { Controller, Get, Query } from '@nestjs/common';

import { paginated, Pagination, PaginationParams, RawQuery } from '../common';
import { PagosService } from './pagos.service';

/**
 * ============================================================================
 * `/api/pagos/` — Fase 8
 * ----------------------------------------------------------------------------
 * | Ruta | Método | Status | Consumido por |
 * |------|--------|--------|---------------|
 * | `/pagos/` | GET | 200 | `PaymentTableState`, `IndexPaymentState` (dashboard) |
 * | `/pagos/all-ids/` | GET | 200 | selección masiva (`trigger_select_all`) |
 *
 * **Sin POST, PUT ni DELETE** (D10): los pagos entran por ingesta, no por
 * formulario. Ver la cabecera de `pagos.service.ts`.
 *
 * `bulk-action` (`sumar_pagos`, `exportar_pagos_csv`) es de la Fase 9.
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
}
