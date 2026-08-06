import { PrismaClient } from '@prisma/client';

/**
 * ============================================================================
 * ⚠️ ZONAS Y SECTORES — DATO DE DESARROLLO, NO DE PRODUCCIÓN ⚠️
 * ----------------------------------------------------------------------------
 * A diferencia del resto de los catálogos, estos valores NO salen de
 * `config/utils/`: las listas estáticas de zona y sector se borraron del
 * frontend cuando pasaron a la API y no quedó rastro de los datos reales.
 *
 * Lo de acá abajo es un set inventado, con nombres de Chiloé porque el catálogo
 * de elementos menciona "TV ANALOGO QUELLON". Sirve para tener dropdowns
 * poblados, ver `zona_str` resuelto y probar el filtrado sector→zona. **No es
 * la geografía real de la empresa.**
 *
 * Cuando negocio pase la lista buena: reemplazar `ZONAS` y correr el seed de
 * nuevo. Los sectores que ya no estén en la lista NO se borran solos —
 * `sectores.zona_id` es RESTRICT y puede haber direcciones colgando—; eso se
 * limpia a mano y a conciencia.
 *
 * Nótese que los sectores llevan el nombre de la zona pegado ("Centro Castro",
 * no "Centro"): D3 exige que `sectores.sector` sea UNIQUE GLOBAL, porque los
 * filtros del frontend mandan el sector como string y un nombre repetido entre
 * zonas haría la búsqueda ambigua.
 * ============================================================================
 */
const ZONAS: ReadonlyArray<readonly [zona: string, sectores: readonly string[]]> = [
  ['Castro', ['Centro Castro', 'Gamboa', 'Ten Ten', 'Pulpito', 'Nercon']],
  ['Ancud', ['Centro Ancud', 'Pudeto', 'Lechagua', 'Chacao']],
  ['Quellon', ['Centro Quellon', 'Yaldad', 'Aguantao', 'Quellon Viejo']],
  ['Dalcahue', ['Centro Dalcahue', 'San Juan', 'Tenaun']],
  ['Chonchi', ['Centro Chonchi', 'Notuco', 'Terao']],
];

export async function sembrarZonasDesarrollo(prisma: PrismaClient): Promise<void> {
  let sectoresCreados = 0;

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
      sectoresCreados += 1;
    }
  }

  console.log(`· zonas: ${ZONAS.length} y sectores: ${sectoresCreados}  ⚠️ datos de desarrollo`);
}
