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
import { DireccionesService } from './direcciones.service';
import { DireccionWriteDto } from './dto/direccion.dto';

/**
 * `/api/direcciones/` — Fase 5.
 *
 * | Ruta | Método | Status | Consumido por |
 * |------|--------|--------|---------------|
 * | `/direcciones/` | GET (`?cliente_id=`) | 200 | tabla del detalle de cliente, dropdown de servicios |
 * | `/direcciones/` | POST | **201** | alta de dirección |
 * | `/direcciones/{id}/` | GET | 200 | `DirectionDetailState` |
 * | `/direcciones/{id}/` | PUT | 200 | edición |
 * | `/direcciones/{id}/` | DELETE | **204** | botón de la tabla |
 */
@Controller('direcciones')
export class DireccionesController {
  constructor(private readonly direcciones: DireccionesService) {}

  @Get()
  async listar(@Query() query: RawQuery, @Pagination() pagina: PaginationParams) {
    const [count, resultados] = await this.direcciones.listar(query, pagina);
    return paginated(count, resultados);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.direcciones.obtener(id);
  }

  @Post()
  crear(@Body() dto: DireccionWriteDto) {
    return this.direcciones.crear(dto);
  }

  @Put(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: DireccionWriteDto) {
    return this.direcciones.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.direcciones.eliminar(id);
  }
}
