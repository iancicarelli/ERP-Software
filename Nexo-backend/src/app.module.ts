import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { ClientesModule } from './clientes/clientes.module';
import { envValidationSchema } from './config/env.validation';
import { DireccionesModule } from './direcciones/direcciones.module';
import { HealthModule } from './health/health.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { PagosModule } from './pagos/pagos.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServiciosModule } from './servicios/servicios.module';
import { TransferenciasModule } from './transferencias/transferencias.module';

/**
 * Raíz de la aplicación. La estructura es modular por entidad: cada fase del
 * ROADMAP agrega su propio módulo acá (clientes, direcciones, servicios,
 * ordenes, pagos, transferencias, auth…).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Dentro de Docker el entorno lo inyecta compose; el archivo es para
      // correr el backend fuera del contenedor.
      envFilePath: ['.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        // Reporta todas las variables mal de una vez, no de a una.
        abortEarly: false,
      },
    }),
    PrismaModule,
    // AuthModule registra el `JwtAuthGuard` como APP_GUARD: desde acá, todo
    // módulo que se sume queda protegido salvo que se marque con `@Public()`.
    AuthModule,
    CatalogosModule,
    ClientesModule,
    DireccionesModule,
    ServiciosModule,
    OrdenesModule,
    PagosModule,
    TransferenciasModule,
    HealthModule,
  ],
})
export class AppModule {}
