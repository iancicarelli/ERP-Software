import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
} from '@nestjs/common';

import { paginated, Pagination, PaginationParams, RawQuery } from '../common';
import { AsignarClienteDto } from './dto/transferencia.dto';
import { TransferenciasService } from './transferencias.service';

/**
 * ============================================================================
 * `/api/transferencias/` — Fase 8
 * ----------------------------------------------------------------------------
 * | Ruta | Método | Status | Consumido por |
 * |------|--------|--------|---------------|
 * | `/transferencias/` | GET | 200 | `TransferTableState`, `IndexTransferState` |
 * | `/transferencias/all-ids/` | GET | 200 | selección masiva |
 * | `/transferencias/{id}/` | PATCH | 200 | `TransferAssignClientState.save_assignment()` |
 * | `/transferencias/{id}/` | PUT | 200 | mismo handler — ver abajo |
 *
 * ⚠️ **PATCH y PUT hacen lo mismo, y eso es intencional.** El ROADMAP §3.7
 * anota la ruta como `PUT`, pero el frontend manda `PATCH`
 * (`method="PATCH"` en `transfer_assign_client_state.py`). Implementar solo el
 * PUT del papel dejaría el diálogo de asignar cliente contra un 404, y solo el
 * PATCH dejaría el contrato escrito sin cumplir.
 *
 * PATCH es además el verbo correcto: el cuerpo trae un solo campo y el resto de
 * la transferencia —importe, fecha, banco— se conserva. El PUT queda como alias
 * para no romper el contrato documentado; cuando se corrija el ROADMAP se borra
 * el decorador y nada más.
 *
 * `bulk-action` (`generar_voucher` / `eliminar_voucher`) es de la Fase 9 y está
 * bloqueado por R2: nadie documentó todavía el sistema externo de facturación.
 *
 * ⚠️ `all-ids` va ANTES que `:id`: si no, Nest intentaría parsear "all-ids"
 * como entero. Hoy no colisiona —`:id` solo tiene PATCH/PUT— pero el orden se
 * respeta igual para que agregar un `GET /:id` mañana no rompa la selección
 * masiva de golpe.
 * ============================================================================
 */
@Controller('transferencias')
export class TransferenciasController {
  constructor(private readonly transferencias: TransferenciasService) {}

  @Get()
  async listar(@Query() query: RawQuery, @Pagination() pagina: PaginationParams) {
    const [count, resultados] = await this.transferencias.listar(query, pagina);
    return paginated(count, resultados);
  }

  @Get('all-ids')
  async todosLosIds(@Query() query: RawQuery) {
    return { ids: await this.transferencias.todosLosIds(query) };
  }

  @Patch(':id')
  asignarCliente(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarClienteDto,
  ) {
    return this.transferencias.asignarCliente(id, dto);
  }

  /**
   * Alias del PATCH de arriba, para cumplir el `PUT` del ROADMAP §3.7.
   *
   * Va como método propio y no como un segundo decorador sobre `asignarCliente`:
   * apilar `@Patch(':id')` y `@Put(':id')` en el mismo handler **no registra las
   * dos rutas** —Nest guarda un solo verbo por método y el segundo decorador
   * pisa al primero—, así que el PUT quedaría devolviendo 404 sin que nada lo
   * avise. Se verificó leyendo las rutas que mapea Nest al arrancar.
   */
  @Put(':id')
  asignarClientePut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarClienteDto,
  ) {
    return this.transferencias.asignarCliente(id, dto);
  }
}
