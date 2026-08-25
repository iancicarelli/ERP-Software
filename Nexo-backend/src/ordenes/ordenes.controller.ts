import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
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
 * | `/ordenes/bulk-action/` | POST | **200** | export CSV e impresión PDF (Fase 9) |
 * | `/ordenes/{id}/` | GET | 200 | `OrderDetailState.load_orden_by_id()` |
 * | `/ordenes/{id}/` | PUT | 200 | `OrderDetailState.save_entity()` |
 *
 * **Sin DELETE**, a diferencia de clientes y servicios: la UI de órdenes no
 * tiene botón de borrado. Una orden es el registro de un trabajo hecho o
 * planificado; se cierra (`abierto = false`), no se borra.
 *
 * `bulk-action` despacha dos acciones, y las dos devuelven un archivo: el CSV
 * de la tabla y la ficha en PDF.
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

  /**
   * `POST /api/ordenes/bulk-action/` — ROADMAP §3.9.
   *
   * **200 y no el 201 por default de Nest**: el frontend compara contra 200
   * exacto. Ver la nota extendida en `clientes.controller.ts`.
   *
   * Las dos acciones devuelven archivo, así que las dos pasan por
   * `comoAdjunto()`: el nombre que baja al disco del usuario sale del header
   * `Content-Disposition`, no del frontend.
   */
  @Post('bulk-action')
  @HttpCode(HttpStatus.OK)
  async bulkAction(
    @Body() dto: BulkActionDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    switch (dto.action) {
      case 'exportar_ordenes_csv':
        comoAdjunto(res, nombreConFecha('ordenes', 'csv'), CSV_CONTENT_TYPE);
        return new StreamableFile(this.ordenes.exportarCsv(dto.selected_ids));

      case 'imprimir_orden_de_trabajo': {
        // El `await` va ANTES de tocar los headers a propósito: `imprimir()`
        // valida el tope y la existencia de las órdenes, y si falla tiene que
        // poder responder un JSON de error — no un PDF roto con nombre.
        const pdf = await this.ordenes.imprimir(dto.selected_ids);

        comoAdjunto(
          res,
          nombreDelPdf(dto.selected_ids),
          'application/pdf',
        );
        return new StreamableFile(pdf);
      }

      default:
        throw accionNoSoportada(dto.action);
    }
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

/**
 * Una sola orden se baja como `orden_de_trabajo_123.pdf`; varias, como
 * `ordenes_de_trabajo_2026-08-24.pdf`.
 *
 * Poner el número cuando es una sola no es cosmético: imprimir la ficha de una
 * orden puntual es el caso más común, y en la carpeta de Descargas
 * `orden_de_trabajo.pdf`, `orden_de_trabajo (1).pdf`… son indistinguibles.
 */
function nombreDelPdf(ids: number[]): string {
  if (ids.length === 1) return `orden_de_trabajo_${ids[0]}.pdf`;
  return nombreConFecha('ordenes_de_trabajo', 'pdf');
}
