import { PrismaClient } from '@prisma/client';

/**
 * ============================================================================
 * Datos de los catálogos — Fase 4a
 * ----------------------------------------------------------------------------
 * FUENTE: `Nexo-frontend/Nexo/config/utils/`, que es donde el frontend tenía
 * estas listas hardcodeadas antes de que existiera el backend. Se transcriben
 * TAL CUAL, con su capitalización original (que es inconsistente entre listas
 * —ELEMENTOS en mayúsculas, el resto en Title Case—, pero es lo que el negocio
 * ve hoy en pantalla y lo que guardan los datos viejos).
 *
 * Lo único que NO sale de ahí son las zonas y los sectores: esas listas se
 * borraron del frontend cuando pasaron a la API y no quedó rastro. Van en
 * `zonas-sectores.ts`, aparte, con localidades reales de Biobío y La Araucanía.
 *
 * Todo es idempotente: se puede correr N veces sin duplicar ni pisar cambios.
 * ============================================================================
 */

// ── /api/elementos/ ─────────────────────────────────────────────────────────
// Fuente: `config/utils/elementos_map.py`.
//
// ⚠️ Los IDs son PARTE DEL CONTRATO, no un detalle de implementación:
// `ServiceDetailState.update_field()` hace `ELEMENTOS_MAP.get(value, 0)` y
// manda ESE número como `elemento` al guardar un servicio. Si acá se
// autogeneraran, el frontend asignaría planes equivocados en silencio.
// Los huecos (4-6, 11, 13) son del sistema viejo y se respetan.
const ELEMENTOS: ReadonlyArray<readonly [number, string]> = [
  [1, 'PLAN DUO CLASICO'],
  [2, 'PLAN DUO PREMIUM'],
  [3, 'PLAN DUO SUPERIOR'],
  [7, 'INTERNET CLASICO'],
  [8, 'INTERNET PREMIUM'],
  [9, 'INTERNET SUPERIOR'],
  [10, 'TV FIBRA OPTICA'],
  [12, 'TV ANALOGO'],
  [14, 'ANEXO'],
  [15, 'PLAN DUO CLASICO + ANEXOS'],
  [16, 'PLAN DUO PREMIUM + ANEXOS'],
  [17, 'PLAN DUO SUPERIOR + ANEXOS'],
  [18, 'TV FIBRA OPTICA + ANEXOS'],
  [19, 'TV ANALOGO + ANEXOS'],
  [20, 'SERVICIO TV'],
  [21, 'SERVICIO TV E INTERNET'],
  [22, 'SERVICIO INTERNET'],
  [23, 'DONACION'],
  [24, 'SINTONIZADOR'],
  [25, 'MIGRACION TV DIGITAL'],
  [26, 'MIGRACION TV DIGITAL + ANEXO'],
  [27, 'EXTENSOR DE WIFI'],
  [28, 'ANEXO EXTERIOR'],
  [29, 'TV ANALOGO QUELLON'],
];

// ── /api/causadebajas/ ──────────────────────────────────────────────────────
// Fuente: `config/utils/causas_baja_config.py`.
const CAUSAS_BAJA = [
  'Por morosidad',
  'Cambio de empresa',
  'Falta de postes',
  'Inconformidad',
  'Cambio de titular',
  'Renuncia',
];

// ── /api/estados-ordenes/ ───────────────────────────────────────────────────
// Fuente: `config/utils/estado_config.py`.
const ESTADOS_ORDEN = [
  'Por instalar',
  'Programado',
  'Suspendido',
  'Instalado',
  'Renuncia',
  'Factibilidad',
  'Rechazado',
  'Por pagar',
];

// ── /api/causas-ordenes/ ────────────────────────────────────────────────────
// Fuente: `config/utils/orders/causas_orders_config.py`.
const CAUSAS_ORDEN = [
  'Falta de poste',
  'Distancia NAP',
  'Tecnico ausente',
  'Cliente ausente',
  'Falta de poda',
  'NAP saturado',
  'NAP sin potencia',
  'Electricidad irregular',
  'Canalizado',
];

// ── /api/servicios-ordenes/ ─────────────────────────────────────────────────
// Fuente: `config/utils/orders/elementos_orders_config.py`.
// OJO: se llama ELEMENTOS ahí, pero es el combo "servicio" del formulario de
// orden (`OrdersAddState` lo pide a `/servicios-ordenes/`). Es una lista
// DISTINTA de `/elementos/`: menos entradas y otra capitalización.
const SERVICIOS_ORDEN = [
  'Plan Duo Clasico',
  'Plan Duo Premium',
  'Plan Duo Superior',
  'Plan Duo Clasico + Anexo',
  'Plan Duo Premium + Anexo',
  'Plan Duo Superior + Anexo',
  'Internet Clasico',
  'Internet Premium',
  'Internet Superior',
  'Servicio TV Fibra Optica',
  'Servicio TV Fibra Optica + Anexo',
  'Cambio Domicilio',
  'Instalacion Extensor WIFI',
  'Servicio TV Analogo',
  'Servicio TV Analogo + Anexo',
  'Servicios Extras',
  'Plan Empresa',
];

/**
 * ── /api/tecnicos-ordenes/ y /api/vendedores-ordenes/ ──────────────────────
 * Fuente: `config/utils/orders/tecnicos_config.py` y
 * `config/utils/vendedores_config.py`, donde son un solo string por persona.
 *
 * El corte en `nombre1` / `apellido1` es una interpretación mía: el frontend
 * solo los concatena (`f"{nombre1} {apellido1} {apellido2}"`), así que en
 * pantalla se ve igual se corte donde se corte. Lo que sí depende del corte
 * son los filtros por campo de la Fase 7 (`vendedor_nombre1`,
 * `tecnico_apellido1`). **Validar los nombres compuestos con negocio.**
 *
 * ── D8 (decidida el 2026-08-11): el corte se queda, el seed reconcilia ──
 * Los 6 filtros de personas de la Fase 7 se declaran `icontains`, así que un
 * corte discutible casi no se nota al buscar: `tecnico_nombre1=Juan` encuentra
 * igual a "Juan Carlos". Lo que sí dolía era corregirlo después.
 *
 * `sembrarPersonas()` reconcilia, como `zonas-sectores.ts`. Antes deduplicaba
 * con un `findFirst({ nombre1, apellido1 })` y **no actualizaba nada**: cambiar
 * el corte de "Juan Carlos Castillo" no corregía la fila, creaba un técnico
 * nuevo y dejaba el viejo con sus órdenes colgando. Es el mismo modo de falla
 * que dejó vivas las zonas de Chiloé hasta la Fase 4a.
 *
 * Ahora corregir un nombre es editar el array y volver a correr el seed.
 */
type Persona = readonly [nombre1: string, apellido1: string, apellido2?: string];

const TECNICOS: ReadonlyArray<Persona> = [
  ['Cristian', 'Quiroz'],
  ['Miguel', 'Mellado'],
  ['Juan Carlos', 'Castillo'], // ¿"Juan Carlos" o "Juan" + 2º apellido "Castillo"?
  ['Isidoro', 'Molina'],
  ['Lucas', 'Vega'],
  ['Rodrigo', 'Castillo'],
  ['Sergio', 'Sepulveda'],
  ['Felipe', 'Astroza'],
  ['Paulina', 'Pino'],
  ['Richard', 'Poveda'],
  ['Francisco', 'Parra'],
  ['Victor', 'Saez'],
  ['Victor', 'Rivera'],
  ['Yeihson', 'Cuevas'],
  ['Javier', 'Arriaza'],
  ['Sergio', 'Potter'],
  ['Ricardo', 'Gomez'],
  ['Manuel', 'Espinoza'],
  ['Brian', 'Escobar'],
  ['Daniela', 'Salcedo'],
  ['Luis', 'Veloso'],
  ['Christhofer', 'Villablanca'],
  ['Jhon', 'Vega'],
  ['Leonel', 'Veliz'],
  ['Eduardo', 'Burnes'],
];

const VENDEDORES: ReadonlyArray<Persona> = [
  ['Paulina', 'Pino'],
  ['Maria', 'Parra'],
  ['Daniela', 'Salcedo'],
  ['Ivanna', 'Burkhardt'],
  ['Carla', 'Leal'],
  ['Patricio', 'Manosalva'],
  ['Carlos', 'Hurtado'],
  ['Alexander', 'Cuevas'],
  ['Crismaily', 'Sosa'],
  ['Miguel', 'Barrientos'],
  ['Eduardo', 'Burnes'],
  ['Cristina', 'Sosa'],
];

export async function sembrarCatalogos(prisma: PrismaClient): Promise<void> {
  // ── Elementos: upsert por ID, que es el que importa ────────────────────
  for (const [id, elemento] of ELEMENTOS) {
    await prisma.elemento.upsert({
      where: { id },
      create: { id, elemento },
      update: { elemento },
    });
  }

  // Insertar IDs a mano NO mueve la secuencia de Postgres: sin este setval, el
  // primer `create` sin id intentaría el id 1 y chocaría con PLAN DUO CLASICO.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('elementos', 'id'),
                   GREATEST((SELECT MAX(id) FROM elementos), 1))`,
  );
  console.log(`· elementos: ${ELEMENTOS.length} (IDs fijos del contrato)`);

  // ── Los que tienen el nombre UNIQUE: upsert directo ───────────────────
  for (const causa of CAUSAS_BAJA) {
    await prisma.causaBaja.upsert({ where: { causa }, create: { causa }, update: {} });
  }
  console.log(`· causas de baja: ${CAUSAS_BAJA.length}`);

  for (const estado of ESTADOS_ORDEN) {
    await prisma.estadoOrden.upsert({ where: { estado }, create: { estado }, update: {} });
  }
  console.log(`· estados de orden: ${ESTADOS_ORDEN.length}`);

  for (const causa of CAUSAS_ORDEN) {
    await prisma.causaOrden.upsert({ where: { causa }, create: { causa }, update: {} });
  }
  console.log(`· causas de orden: ${CAUSAS_ORDEN.length}`);

  for (const servicio of SERVICIOS_ORDEN) {
    await prisma.servicioOrden.upsert({
      where: { servicio },
      create: { servicio },
      update: {},
    });
  }
  console.log(`· servicios de orden: ${SERVICIOS_ORDEN.length}`);

  await sembrarPersonas(prisma.tecnico as unknown as DelegadoPersona, TECNICOS, {
    singular: 'técnico',
    plural: 'técnicos',
  });
  await sembrarPersonas(prisma.vendedor as unknown as DelegadoPersona, VENDEDORES, {
    singular: 'vendedor',
    plural: 'vendedores',
  });
}

/**
 * Lo que `sembrarPersonas()` usa de un delegate de Prisma. `tecnico` y
 * `vendedor` son dos modelos con exactamente la misma forma, pero sus tipos
 * generados son distintos y TypeScript no los unifica: de ahí la interfaz
 * mínima y el cast en el llamador.
 */
interface DelegadoPersona {
  findFirst(args: {
    where: { nombre1: string; apellido1: string };
  }): Promise<{ id: number } | null>;
  create(args: {
    data: { nombre1: string; apellido1: string; apellido2: string | null };
  }): Promise<unknown>;
  update(args: {
    where: { id: number };
    data: { apellido2: string | null };
  }): Promise<unknown>;
  findMany(args: {
    include: { _count: { select: { ordenes: true } } };
  }): Promise<
    Array<{
      id: number;
      nombre1: string;
      apellido1: string;
      usuario_id: number | null;
      _count: { ordenes: number };
    }>
  >;
  deleteMany(args: { where: { id: { in: number[] } } }): Promise<unknown>;
}

/**
 * Inserta, actualiza y reconcilia una lista de personas.
 *
 * **Identidad = `nombre1 + apellido1`.** No hay UNIQUE en la base a propósito
 * —dos técnicos pueden llamarse igual—, así que la deduplicación vive acá; para
 * estas listas, donde cada persona aparece una vez, alcanza.
 *
 * Consecuencia de esa elección: si se corrige el corte de un nombre compuesto
 * ("Juan Carlos" + "Castillo" → "Juan" + "Carlos Castillo"), la fila vieja NO
 * se reconoce como la misma persona. Si no tiene órdenes, se borra y se crea la
 * nueva —el resultado es el correcto—. Si tiene órdenes, se conserva y quedan
 * las dos: eso hay que resolverlo a mano, y el seed lo grita por consola en vez
 * de dejarlo pasar en silencio, que es lo que hacía antes.
 *
 * Tampoco se borra a nadie con un usuario enganchado (`usuario_id`): esa fila
 * es la contraparte de una cuenta real, no un dato de catálogo.
 */
async function sembrarPersonas(
  delegado: DelegadoPersona,
  personas: ReadonlyArray<Persona>,
  etiqueta: { singular: string; plural: string },
): Promise<void> {
  for (const [nombre1, apellido1, apellido2] of personas) {
    const existente = await delegado.findFirst({ where: { nombre1, apellido1 } });

    if (existente) {
      // El apellido materno sí se corrige sobre la fila existente: no forma
      // parte de la identidad, así que cambiarlo no crea una persona nueva.
      await delegado.update({
        where: { id: existente.id },
        data: { apellido2: apellido2 ?? null },
      });
    } else {
      await delegado.create({
        data: { nombre1, apellido1, apellido2: apellido2 ?? null },
      });
    }
  }

  console.log(`· ${etiqueta.plural}: ${personas.length}`);

  // ── Reconciliación ──
  const enLista = new Set(personas.map(([nombre1, apellido1]) => `${nombre1} ${apellido1}`));

  const todas = await delegado.findMany({
    include: { _count: { select: { ordenes: true } } },
  });

  const sobrantes = todas.filter(
    (p) => !enLista.has(`${p.nombre1} ${p.apellido1}`),
  );

  const libres = sobrantes.filter((p) => p._count.ordenes === 0 && p.usuario_id === null);

  if (libres.length > 0) {
    await delegado.deleteMany({ where: { id: { in: libres.map((p) => p.id) } } });
    console.log(`· ${etiqueta.plural} obsoletos eliminados: ${libres.length}`);
  }

  for (const persona of sobrantes) {
    if (libres.includes(persona)) continue;

    const motivo =
      persona._count.ordenes > 0
        ? `${persona._count.ordenes} orden(es)`
        : 'un usuario asociado';

    console.warn(
      `  ⚠️  ${etiqueta.singular} "${persona.nombre1} ${persona.apellido1}" ya no está en la ` +
        `lista pero tiene ${motivo}. Se conserva: si es el mismo nombre escrito de ` +
        `otra forma, quedó duplicado y hay que unificarlo a mano.`,
    );
  }
}
