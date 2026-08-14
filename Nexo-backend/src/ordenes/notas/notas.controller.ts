import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { AuthenticatedUser, CurrentUser } from '../../auth';
import { paginated, Pagination, PaginationParams, RawQuery } from '../../common';
import { NotaWriteDto } from './dto/nota.dto';
import { NotasService } from './notas.service';

/**
 * ============================================================================
 * `/api/notas-ordenes/` — Fase 7
 * ----------------------------------------------------------------------------
 * | Ruta | Método | Status | Consumido por |
 * |------|--------|--------|---------------|
 * | `/notas-ordenes/` | GET (`?orden_trabajo_id=`) | 200 | `OrderNotasState.load_notas_for_current_order()` |
 * | `/notas-ordenes/` | POST | **201** | `OrderNotasState.add_nota()` |
 *
 * El listado va paginado como todo lo demás: `load_notas_for_current_order()`
 * pide `page_size=100` y lee `results`, aunque también tolera una lista pelada.
 * Se respeta la envoltura DRF porque es lo que hace el resto de la API.
 * ============================================================================
 */
@Controller('notas-ordenes')
export class NotasController {
  constructor(private readonly notas: NotasService) {}

  @Get()
  async listar(@Query() query: RawQuery, @Pagination() pagina: PaginationParams) {
    const [count, resultados] = await this.notas.listar(query, pagina);
    return paginated(count, resultados);
  }

  @Post()
  // 201 es el default de Nest para POST y lo que el frontend compara
  // (`if response.status_code == 201`).
  crear(@Body() dto: NotaWriteDto, @CurrentUser() usuario?: AuthenticatedUser) {
    return this.notas.crear(dto, usuario?.id ?? null);
  }
}
