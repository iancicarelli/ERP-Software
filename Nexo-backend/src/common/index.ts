/**
 * Capa de compatibilidad DRF (Fase 2). Todo lo que los módulos de entidad
 * necesitan para cumplir el contrato del frontend sin repetir código.
 */
export * from './errors/drf-exception.filter';
export * from './fechas';
export * from './errors/drf-validation.exception';
export * from './errors/drf-validation.pipe';
export * from './errors/prisma-meta';
export * from './filters/count-filters';
export * from './filters/filter-engine';
export * from './filters/filter-map.types';
export * from './pagination/pagination';
export * from './pagination/pagination.interceptor';
