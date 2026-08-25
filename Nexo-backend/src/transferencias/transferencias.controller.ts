import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import {
  accionNoImplementada,
  accionNoSoportada,
  BulkActionDto,
  paginated,
  Pagination,
  PaginationParams,
  RawQuery,
} from '../common';
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
 * | `/transferencias/bulk-action/` | POST | **501** | vouchers — bloqueado por R2 |
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
 * `bulk-action` existe desde la Fase 9 pero **no hace nada todavía**: sus dos
 * únicas acciones son `generar_voucher` y `eliminar_voucher`, y las dos siguen
 * bloqueadas por R2 — nadie documentó el sistema externo de facturación
 * (probablemente Defontana). Ver el handler más abajo.
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

  /**
   * `POST /api/transferencias/bulk-action/` — ROADMAP §3.9.
   *
   * **Devuelve 501 en las dos acciones que declara el contrato.** No es un
   * olvido: `generar_voucher` y `eliminar_voucher` emiten y anulan documentos
   * tributarios contra un sistema externo del que no se conoce ni la API ni las
   * credenciales (R2). Todo lo que se podría escribir hoy sería una simulación
   * que devuelve números de voucher inventados — y en facturación, un número
   * inventado que el usuario cree real es peor que un error.
   *
   * La ruta existe igual, en vez de dejar que caiga en el 404 del router, por
   * dos motivos: el 501 dice "esto está previsto y todavía no está" en vez de
   * "esta URL no existe", y el `detail` queda en los logs del backend cuando
   * alguien pruebe el botón y se pregunte por qué no pasa nada.
   *
   * Qué falta para implementarlas: contrato de la API externa, credenciales, y
   * qué se persiste de la respuesta (hoy no hay columnas de voucher en
   * `transferencias`).
   */
  @Post('bulk-action')
  @HttpCode(HttpStatus.OK)
  bulkAction(@Body() dto: BulkActionDto): never {
    if (dto.action === 'generar_voucher' || dto.action === 'eliminar_voucher') {
      throw accionNoImplementada(
        dto.action,
        'falta definir la integración con el sistema externo de facturación.',
      );
    }

    throw accionNoSoportada(dto.action);
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
