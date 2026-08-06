import { Module } from '@nestjs/common';

import { crearControladorCatalogo } from './catalogo.controlador';
import { CATALOGOS } from './catalogos.definiciones';

/**
 * Los 9 catálogos de la Fase 4a. Agregar uno es agregar una entrada en
 * `CATALOGOS` — este módulo no se toca.
 *
 * Todos quedan detrás del `JwtAuthGuard` global (Fase 3): no llevan `@Public()`
 * y el frontend los pide con `fetch_with_auth`, que ya manda el Bearer.
 */
@Module({
  controllers: CATALOGOS.map(crearControladorCatalogo),
})
export class CatalogosModule {}
