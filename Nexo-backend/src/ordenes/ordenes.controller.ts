import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { paginated, Pagination, PaginationParams, RawQuery } from '../common';
import { OrdenWriteDto } from './dto/orden.dto';
import { OrdenesService } from './ordenes.service';

/**
 * ============================================================================
 * `/api/ordenes/` — Fase 7
 * ----------------------------------------------------------------------------
 * | Ruta | Método | Status | Consumido por |
 * |------|--------|--------|---------------|
 * | `/ordenes/` | GET | 200 | `OrderTableState` |
 * | `/ordenes/` | POST | **201** | `OrdersAddState.add_entity()` |
 * | `/ordenes/all-ids/` | GET | 200 | selección masiva (`trigger_select_all`) |
 * | `/ordenes/{id}/` | GET | 200 | `OrderDetailState.load_orden_by_id()` |
 * | `/ordenes/{id}/` | PUT | 200 | `OrderDetailState.save_entity()` |
 *
 * **Sin DELETE**, a diferencia de clientes y servicios: la UI de órdenes no
 * tiene botón de borrado. Una orden es el registro de un trabajo hecho o
 * planificado; se cierra (`abierto = false`), no se borra.
 *
 * `bulk-action` (export CSV, impresión del PDF) es de la Fase 9.
 *
 * ⚠️ `all-ids` va ANTES que `:id`: si no, Nest intentaría parsear "all-ids"
 * como un entero y el `ParseIntPipe` devolvería un 400.
 * ============================================================================
 */
@Controller('ordenes')
export class OrdenesController {
  constructor(private readonly ordenes: OrdenesService) {}

  @Get()
  async listar(@Query() query: RawQuery, @Pagination() pagina: PaginationParams) {
    const [count, resultados] = await this.ordenes.listar(query, pagina);
    return paginated(count, resultados);
  }

  @Get('all-ids')
  async todosLosIds(@Query() query: RawQuery) {
    return { ids: await this.ordenes.todosLosIds(query) };
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.ordenes.obtener(id);
  }

  @Post()
  crear(@Body() dto: OrdenWriteDto) {
    return this.ordenes.crear(dto);
  }

  @Put(':id')
  // Devuelve el objeto completo: el frontend lo reasigna al DTO
  // (`self.orden = OrderDetailDTO(**data)`).
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: OrdenWriteDto) {
    return this.ordenes.actualizar(id, dto);
  }
}
