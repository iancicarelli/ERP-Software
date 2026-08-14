/**
 * ============================================================================
 * Seed de desarrollo — orquestador
 * ----------------------------------------------------------------------------
 *   npm run prisma:seed        (o `npx prisma db seed`)
 *   docker compose exec backend npm run prisma:seed
 *
 * Todo lo de acá es idempotente: correrlo N veces deja la base igual que
 * correrlo una. Se puede encadenar detrás de `prisma migrate` sin pensarlo.
 *
 *   · usuario admin        (Fase 3)
 *   · catálogos            (Fase 4a) — datos reales de `config/utils/`
 *   · zonas y sectores     (Fase 4a) — Biobío y Araucanía, ver el archivo
 *
 * El volumen de prueba (~1000 clientes) llega en la Fase 11.
 * ============================================================================
 */
import { PrismaClient } from '@prisma/client';

import { sembrarCatalogos } from './seeds/catalogos';
import { sembrarUsuarioAdmin } from './seeds/usuario-admin';
import { sembrarZonasSectores } from './seeds/zonas-sectores';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await sembrarUsuarioAdmin(prisma);
  await sembrarCatalogos(prisma);
  await sembrarZonasSectores(prisma);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
