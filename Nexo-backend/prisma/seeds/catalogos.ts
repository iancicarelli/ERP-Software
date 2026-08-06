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
 * `zonas-desarrollo.ts`, aparte y marcadas como dato de desarrollo.
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

  // ── Personas: sin UNIQUE, hay que buscar antes ────────────────────────
  // No se le pone UNIQUE al nombre a propósito: dos técnicos pueden llamarse
  // igual. El seed deduplica por nombre completo, que para estas listas
  // (donde cada persona aparece una vez) alcanza.
  for (const [nombre1, apellido1, apellido2] of TECNICOS) {
    const existente = await prisma.tecnico.findFirst({ where: { nombre1, apellido1 } });
    if (!existente) {
      await prisma.tecnico.create({ data: { nombre1, apellido1, apellido2: apellido2 ?? null } });
    }
  }
  console.log(`· técnicos: ${TECNICOS.length}`);

  for (const [nombre1, apellido1, apellido2] of VENDEDORES) {
    const existente = await prisma.vendedor.findFirst({ where: { nombre1, apellido1 } });
    if (!existente) {
      await prisma.vendedor.create({ data: { nombre1, apellido1, apellido2: apellido2 ?? null } });
    }
  }
  console.log(`· vendedores: ${VENDEDORES.length}`);
}
