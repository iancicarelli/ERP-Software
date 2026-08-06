import { Controller, Get, Type } from '@nestjs/common';

import { paginated, Pagination, PaginationParams } from '../common';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogoDefinicion } from './catalogos.definiciones';

/**
 * ============================================================================
 * Fábrica de controladores de catálogo — Fase 4a
 * ----------------------------------------------------------------------------
 * Convierte una `CatalogoDefinicion` en un controlador de Nest con un único
 * `GET`. Nueve definiciones → nueve controladores, todos con el mismo cuerpo.
 *
 * Por qué una fábrica y no nueve archivos: el cuerpo del handler son tres
 * líneas idénticas y lo único que cambia es la tabla y el serializer. Con nueve
 * copias, arreglar algo del contrato (el `count` de la paginación, un orden,
 * el manejo de un campo) obliga a acordarse de tocar las nueve.
 *
 * La clase se define DENTRO de la función a propósito: TypeScript emite el
 * `design:paramtypes` de la clase decorada, que es de donde Nest saca que el
 * constructor pide un `PrismaService`. Es el mismo patrón que la documentación
 * de Nest usa para mixins.
 *
 * Solo lectura: el frontend nunca da de alta un catálogo (los valores vienen
 * del seed). Si algún día hace falta un ABM, es un módulo aparte y no se toca
 * este contrato.
 * ============================================================================
 */
export function crearControladorCatalogo(
  definicion: CatalogoDefinicion<unknown>,
): Type<unknown> {
  @Controller(definicion.ruta)
  class ControladorCatalogo {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * `GET /api/<ruta>/` — paginado DRF. Los dropdowns piden `page_size=500` y
     * paginan hasta que `next` sea `null`; el `PaginationInterceptor` arma esa
     * envoltura a partir del `paginated()`.
     *
     * El `count` sale de un `COUNT(*)` propio dentro de la misma transacción
     * que el `findMany`: sin eso, un alta concurrente entre las dos queries
     * dejaría un `count` que no corresponde a la página devuelta.
     */
    @Get()
    async listar(@Pagination() pagina: PaginationParams) {
      const [count, filas] = await definicion.consultar(this.prisma, pagina);

      return paginated(
        count,
        filas.map((fila) => definicion.serializar(fila)),
      );
    }
  }

  // Sin esto las nueve clases se llaman igual y el log de arranque de Nest
  // muestra nueve veces "ControladorCatalogo".
  Object.defineProperty(ControladorCatalogo, 'name', {
    value: nombreDeClase(definicion.ruta),
  });

  return ControladorCatalogo;
}

/** `servicios-ordenes` → `ServiciosOrdenesController`. */
function nombreDeClase(ruta: string): string {
  const pascal = ruta
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join('');

  return `${pascal}Controller`;
}
