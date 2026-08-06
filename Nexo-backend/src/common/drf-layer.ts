import { INestApplication } from '@nestjs/common';

import { DrfExceptionFilter } from './errors/drf-exception.filter';
import { createDrfValidationPipe } from './errors/drf-validation.pipe';
import { PaginationInterceptor } from './pagination/pagination.interceptor';

/**
 * Registra la capa de compatibilidad DRF completa (Fase 2).
 *
 * Está en una función y no suelto en `main.ts` para que el test de integración
 * (`drf-layer.integration.spec.ts`) monte EXACTAMENTE la misma configuración:
 * si alguien agrega o saca un interceptor acá, el test lo cubre solo.
 *
 * Ninguna de las tres piezas necesita inyección de dependencias, por eso van
 * como instancias y no como providers `APP_FILTER` / `APP_PIPE`.
 */
export function configureDrfLayer(app: INestApplication): void {
  // Errores con forma DRF: `{campo: [msgs]}` en validación, `{detail}` en el resto.
  app.useGlobalFilters(new DrfExceptionFilter());
  // Validación que emite ese mismo shape en vez del `{message, error, statusCode}`.
  app.useGlobalPipes(createDrfValidationPipe());
  // Listados envueltos en `{count, next, previous, results}`.
  app.useGlobalInterceptors(new PaginationInterceptor());
}
