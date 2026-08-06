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
import { ClientesService } from './clientes.service';
import { ClienteWriteDto } from './dto/cliente.dto';

/**
 * ============================================================================
 * `/api/clientes/` — Fase 5
 * ----------------------------------------------------------------------------
 * | Ruta | Método | Status | Consumido por |
 * |------|--------|--------|---------------|
 * | `/clientes/` | GET | 200 | `ClientTableState`, `TransferAssignClientState` (`?search=`) |
 * | `/clientes/` | POST | **201** | `ClientAddState.add_entity()` |
 * | `/clientes/all-ids/` | GET | 200 | selección masiva |
 * | `/clientes/{id}/` | GET | 200 | `ClientDetailState`, alta de dirección |
 * | `/clientes/{id}/` | PUT | 200 | `ClientDetailState.save_entity()` |
 * | `/clientes/{id}/` | DELETE | **204** | botón Eliminar del detalle |
 *
 * `all-ids` va declarada ANTES que `:id`: Nest resuelve por orden de
 * declaración y `/clientes/all-ids/` matchearía `:id` primero, que fallaría al
 * parsear "all-ids" como entero.
 * ============================================================================
 */
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  async listar(@Query() query: RawQuery, @Pagination() pagina: PaginationParams) {
    const [count, resultados] = await this.clientes.listar(query, pagina);
    return paginated(count, resultados);
  }

  @Get('all-ids')
  async todosLosIds(@Query() query: RawQuery) {
    return { ids: await this.clientes.todosLosIds(query) };
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.clientes.obtener(id);
  }

  @Post()
  // 201 es el default de Nest para POST y además lo que el frontend compara.
  crear(@Body() dto: ClienteWriteDto) {
    return this.clientes.crear(dto);
  }

  @Put(':id')
  // Devuelve el objeto completo actualizado: el frontend lo reasigna al DTO
  // (`self.cliente = ClientDetailDTO(**data)`), no solo lee el status.
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ClienteWriteDto) {
    return this.clientes.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.clientes.eliminar(id);
  }
}
