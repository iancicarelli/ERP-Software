/**
 * Autenticación (Fase 3). Lo que los módulos de entidad necesitan importar:
 * `@Public()` para abrir una ruta y `@CurrentUser()` para saber quién pide.
 */
export * from './auth.module';
export * from './auth.service';
export * from './auth.types';
export * from './current-user.decorator';
export * from './jwt-auth.guard';
export * from './password';
export * from './public.decorator';
