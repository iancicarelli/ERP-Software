import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * ============================================================================
 * Módulo de autenticación — Fase 3
 * ----------------------------------------------------------------------------
 * Registra el `JwtAuthGuard` como `APP_GUARD`, o sea GLOBAL: con solo importar
 * este módulo en `AppModule`, todo lo que se agregue de acá en adelante nace
 * protegido. Las excepciones se marcan con `@Public()`.
 *
 * No se usa `@nestjs/passport`: la estrategia sería una sola (bearer JWT) y el
 * guard propio son 40 líneas que además permiten controlar exactamente qué
 * excepción se lanza — con passport, un token inválido termina en el 403 de
 * Nest y rompe el auto-refresh del frontend (§3.3).
 * ============================================================================
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // El secreto lo valida Joi al arrancar (mínimo 16 caracteres), así que
        // acá no hace falta defensa extra: sin `JWT_SECRET` el proceso ni sube.
        secret: config.getOrThrow<string>('JWT_SECRET'),
        // `expiresIn` NO va acá: cada tipo de token tiene el suyo y se pasa en
        // el `signAsync` (`AuthService.sign`).
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
