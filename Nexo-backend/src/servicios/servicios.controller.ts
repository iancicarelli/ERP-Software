import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { paginated, Pagination, PaginationParams, RawQuery } from '../common';
import { ServicioWriteDto } from './dto/servicio.dto';
import { ServiciosService } from './servicios.service';

/**
 * ============================================================================
 * `/api/servicios/` — Fase 6
 * ----------------------------------------------------------------------------
 * | Ruta | Método | Status | Consumido por |
 * |------|--------|--------|---------------|
 * | `/servicios/` | GET | 200 | `ServiceTableState`, `ClientTableServiceState` (`?cliente_id=`) |
 * | `/servicios/` | POST | **201** | `ServiceDetailState.add_entity()` |
 * | `/servicios/{id}/` | GET | 200 | `ServiceDetailState.load_service_by_id()` |
 * | `/servicios/{id}/` | PUT | 200 | `ServiceDetailState.save_entity()` |
 * | `/servicios/{id}/` | DELETE | **204** | botón de la tabla del detalle de cliente |
 *
 * Sin `all-ids` ni `bulk-action`: servicios no tiene selección masiva en el
 * frontend (no está en el inventario del ROADMAP §3.7 y ninguna tabla de
 * servicios extiende `BaseActionsState`).
 * ============================================================================
 */
@Controller('servicios')
export class ServiciosController {
  constructor(private readonly servicios: ServiciosService) {}

  @Get()
  async listar(@Query() query: RawQuery, @Pagination() pagina: PaginationParams) {
    const [count, resultados] = await this.servicios.listar(query, pagina);
    return paginated(count, resultados);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.servicios.obtener(id);
  }

  @Post()
  // 201 es el default de Nest para POST y además lo que el frontend compara.
  crear(@Body() dto: ServicioWriteDto) {
    return this.servicios.crear(dto);
  }

  @Put(':id')
  // Devuelve el objeto completo: el frontend lo reasigna al DTO
  // (`self.servicio = ServiceDetailDTO(**response.json())`).
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ServicioWriteDto) {
    return this.servicios.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.servicios.eliminar(id);
  }
}
