import { PrismaClient } from '@prisma/client';

/**
 * ============================================================================
 * Zonas y sectores — Biobío y La Araucanía
 * ----------------------------------------------------------------------------
 * A diferencia del resto de los catálogos, estos valores NO salen de
 * `config/utils/`: las listas estáticas de zona y sector se borraron del
 * frontend cuando pasaron a la API y no quedó rastro de los datos reales (ni
 * siquiera en el historial de git — nunca se versionaron).
 *
 * Lo de acá abajo son localidades y sectores que **existen de verdad** en las
 * regiones del Biobío y de La Araucanía: 10 zonas (comunas) con sus sectores
 * urbanos y rurales. No es una lista sacada de un sistema de la empresa, así
 * que si el área de operaciones cubre otras comunas, se corrige acá y se vuelve
 * a correr el seed — pero es geografía real, no nombres inventados.
 *
 * ── UNIQUE global del sector (D3) ──
 * `sectores.sector` es UNIQUE GLOBAL, no UNIQUE(sector, zona_id): los filtros
 * del frontend mandan el sector como STRING de nombre (`?sector=Nonguén`) y un
 * nombre repetido entre zonas haría la búsqueda ambigua. La lista está elegida
 * para que ningún nombre se repita —por eso no hay ningún "Centro"—. Al agregar
 * un sector nuevo hay que verificarlo: dos comunas con el mismo barrio revientan
 * el índice único, y el error de Prisma (P2002) no explica el porqué.
 *
 * ── Reconciliación ──
 * `sembrarZonasSectores()` no solo inserta: también borra lo que ya no está en
 * la lista, porque el upsert solo no alcanza (así quedaron dando vueltas las
 * zonas de Chiloé del set anterior). Lo que tiene direcciones u órdenes colgando
 * NO se borra —`zona_id` y `sector_id` son RESTRICT— y se reporta por consola
 * para limpiarlo a conciencia.
 * ============================================================================
 */
const ZONAS: ReadonlyArray<readonly [zona: string, sectores: readonly string[]]> = [
  // ── Región del Biobío ─────────────────────────────────────────────────────
  ['Concepción', ['Barrio Universitario', 'Lorenzo Arenas', 'Nonguén', 'Collao']],
  ['Talcahuano', ['Higueras', 'San Vicente', 'Salinas', 'Denavi Norte']],
  ['San Pedro de la Paz', ['Boca Sur', 'Candelaria', 'Lomas Coloradas', 'Michaihue', 'Andalué']],
  ['Chiguayante', ['Manquimávida', 'Leonera', 'Pedro Medina']],
  ['Coronel', ['Schwager', 'Lagunillas', 'Escuadrón', 'Camilo Olavarría']],

  // ── Región de La Araucanía ────────────────────────────────────────────────
  ['Temuco', ['Amanecer', 'Pueblo Nuevo', 'Labranza', 'Ñielol']],
  ['Padre Las Casas', ['Pulmahue', 'Metrenco', 'Maquehue']],
  ['Villarrica', ['Pucará', 'Molco', 'Licán Ray']],
  ['Pucón', ['Caburgua', 'Quelhue', 'Palguín']],
  ['Angol', ['Huequén', 'El Vergel', 'Ilabaca']],
];

export async function sembrarZonasSectores(prisma: PrismaClient): Promise<void> {
  const nombresZonas = ZONAS.map(([zona]) => zona);
  const nombresSectores = ZONAS.flatMap(([, sectores]) => [...sectores]);

  for (const [nombreZona, sectores] of ZONAS) {
    const zona = await prisma.zona.upsert({
      where: { zona: nombreZona },
      create: { zona: nombreZona },
      update: {},
    });

    for (const sector of sectores) {
      // `update` con el zona_id: si un sector se mudó de zona en la lista, el
      // seed lo corrige en vez de dejarlo apuntando a la vieja.
      await prisma.sector.upsert({
        where: { sector },
        create: { sector, zona_id: zona.id },
        update: { zona_id: zona.id },
      });
    }
  }

  console.log(`· zonas: ${nombresZonas.length} y sectores: ${nombresSectores.length}`);

  await reconciliar(prisma, nombresZonas, nombresSectores);
}

/**
 * Borra lo que ya no está en la lista. Primero los sectores y después las
 * zonas: una zona con sectores vivos no se puede borrar (RESTRICT), así que el
 * orden inverso no funcionaría.
 *
 * Nada se borra a la fuerza. Un sector con direcciones —o una zona con órdenes—
 * se deja donde está y se avisa: decidir a qué sector se mudan esas direcciones
 * es una decisión de negocio, no de un seed.
 */
async function reconciliar(
  prisma: PrismaClient,
  nombresZonas: string[],
  nombresSectores: string[],
): Promise<void> {
  const sectoresSobrantes = await prisma.sector.findMany({
    where: { sector: { notIn: nombresSectores } },
    include: { _count: { select: { direcciones: true, ordenes: true } } },
  });

  const sectoresLibres = sectoresSobrantes.filter(
    (s) => s._count.direcciones === 0 && s._count.ordenes === 0,
  );
  const sectoresEnUso = sectoresSobrantes.filter((s) => !sectoresLibres.includes(s));

  if (sectoresLibres.length > 0) {
    await prisma.sector.deleteMany({ where: { id: { in: sectoresLibres.map((s) => s.id) } } });
    console.log(`· sectores obsoletos eliminados: ${sectoresLibres.length}`);
  }

  for (const sector of sectoresEnUso) {
    console.warn(
      `  ⚠️  sector "${sector.sector}" ya no está en la lista pero tiene ` +
        `${sector._count.direcciones} direccion(es) y ${sector._count.ordenes} orden(es). ` +
        `Se conserva: reasignarlas antes de borrarlo.`,
    );
  }

  // Se recuentan los sectores DESPUÉS del borrado de arriba: una zona obsoleta
  // cuyos sectores acaban de irse ya quedó libre y se puede eliminar en la
  // misma corrida.
  const zonasSobrantes = await prisma.zona.findMany({
    where: { zona: { notIn: nombresZonas } },
    include: { _count: { select: { sectores: true, ordenes: true } } },
  });

  const zonasLibres = zonasSobrantes.filter(
    (z) => z._count.sectores === 0 && z._count.ordenes === 0,
  );
  const zonasEnUso = zonasSobrantes.filter((z) => !zonasLibres.includes(z));

  if (zonasLibres.length > 0) {
    await prisma.zona.deleteMany({ where: { id: { in: zonasLibres.map((z) => z.id) } } });
    console.log(`· zonas obsoletas eliminadas: ${zonasLibres.length}`);
  }

  for (const zona of zonasEnUso) {
    console.warn(
      `  ⚠️  zona "${zona.zona}" ya no está en la lista pero tiene ` +
        `${zona._count.sectores} sector(es) y ${zona._count.ordenes} orden(es). Se conserva.`,
    );
  }
}
