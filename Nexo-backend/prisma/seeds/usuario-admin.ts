import { PrismaClient } from '@prisma/client';

import { hashPassword } from '../../src/auth/password';

/**
 * Usuario administrador (Fase 3).
 *
 * Idempotente y **no destructivo**: si el usuario ya existe no se toca, así que
 * correr el seed dos veces no pisa una contraseña que alguien haya cambiado.
 */
const DEFAULT_USERNAME = 'admin';
/** Solo para desarrollo — en producción `ADMIN_PASSWORD` es obligatoria. */
const DEFAULT_PASSWORD = 'admin';

export async function sembrarUsuarioAdmin(prisma: PrismaClient): Promise<void> {
  const username = process.env.ADMIN_USERNAME?.trim() || DEFAULT_USERNAME;
  const email = process.env.ADMIN_EMAIL?.trim() || null;
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!password && process.env.NODE_ENV === 'production') {
    throw new Error(
      'ADMIN_PASSWORD es obligatoria con NODE_ENV=production: el seed no crea ' +
        'un admin con contraseña por defecto en producción.',
    );
  }

  const existente = await prisma.usuario.findUnique({ where: { username } });
  if (existente) {
    console.log(`· usuario "${username}" ya existe (id=${existente.id}) — sin cambios`);
    return;
  }

  const usuario = await prisma.usuario.create({
    data: {
      username,
      email,
      password: await hashPassword(password ?? DEFAULT_PASSWORD),
      is_active: true,
      is_staff: true,
    },
  });

  console.log(`· usuario "${usuario.username}" creado (id=${usuario.id})`);
  if (!password) {
    console.warn(
      `  ⚠ contraseña por defecto "${DEFAULT_PASSWORD}". Definí ADMIN_PASSWORD ` +
        'en el .env antes de exponer esto fuera de tu máquina.',
    );
  }
}
