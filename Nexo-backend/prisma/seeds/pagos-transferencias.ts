import { PrismaClient } from '@prisma/client';

/**
 * ============================================================================
 * Pagos y transferencias de desarrollo — Fase 8 (D10)
 * ----------------------------------------------------------------------------
 * La Fase 8 es **solo lectura sobre datos sembrados**: sin filas acá,
 * `/payments` y `/transfers` se ven exactamente igual funcionando que rotas, y
 * los cinco contadores que el dashboard saca de cada una leen 0 sin que se
 * pueda distinguir "no hay pagos" de "el endpoint devuelve basura".
 *
 * El volumen realista (~1000 clientes) es de la Fase 11. Esto es el mínimo para
 * VERIFICAR: pocas filas, elegidas para que cada filtro del frontend tenga al
 * menos un caso que matchea y uno que no.
 *
 * ── IDEMPOTENCIA POR MARCA, NO POR UPSERT ──
 * Ni `pagos` ni `transferencias` tienen clave natural: un pago es una fila de
 * cartola, no una entidad con nombre. Sin columna única no hay `upsert`, así
 * que la reconciliación va por marca: las filas sembradas llevan el prefijo
 * `SEED-` en `folio_number` / `codigo_transferencia`, y cada corrida borra
 * las suyas y las vuelve a escribir.
 *
 * Eso deja intacto **todo lo que no sembró este archivo**. Importa: cuando
 * exista la ingesta real (R3), correr el seed en un entorno con datos
 * importados no puede llevárselos por delante.
 *
 * Los ids cambian en cada corrida — es un seed de desarrollo, no una migración.
 *
 * ── FECHAS RELATIVAS A HOY ──
 * Las fechas se calculan contra el día de la corrida, no son literales. Es lo
 * que hace que los contadores "Hoy / Esta Semana / Este Mes" del dashboard
 * muestren algo: con fechas fijas, el seed serviría el día que se escribió y
 * daría 0 a la semana siguiente.
 *
 * Se trabaja en **UTC** (`setUTCHours`), que es como Prisma guarda las columnas
 * `@db.Date` y como las lee `soloFecha()`. Es también la zona de los
 * contenedores, así que el "hoy" del seed y el `date.today()` del dashboard
 * coinciden. En una máquina con TZ local y corriendo de noche podrían diferir
 * en un día; para un seed de desarrollo es aceptable, y es el mismo hueco de
 * zona horaria que el ROADMAP ya dejó anotado en la Fase 2.
 * ============================================================================
 */

const MARCA = 'SEED-';

// ── Clientes de prueba ──────────────────────────────────────────────────────
// Personas inventadas. Existen para que `cliente_existe`, `cliente_str`,
// `cliente_sector` y `cliente_zona` tengan contra qué resolverse: sin al menos
// un cliente con dirección principal, el filtro de sector no puede devolver
// nada y no se distinguiría de un filtro roto.
//
// El sector tiene que existir en `zonas-sectores.ts` (`sectores.sector` es
// UNIQUE global, D3). Se eligieron de zonas distintas a propósito, para que
// filtrar por zona parta el conjunto en vez de devolverlo entero.
const CLIENTES: ReadonlyArray<{
  rut: string;
  nombre1: string;
  nombre2?: string;
  apellido1: string;
  apellido2?: string;
  sector: string;
}> = [
  { rut: '16.204.579-2', nombre1: 'Camila', nombre2: 'Andrea', apellido1: 'Fuentes', apellido2: 'Rojas', sector: 'Nonguén' },
  { rut: '13.871.402-5', nombre1: 'Rodrigo', apellido1: 'Sandoval', apellido2: 'Muñoz', sector: 'San Vicente' },
  { rut: '19.553.118-K', nombre1: 'Javiera', apellido1: 'Contreras', apellido2: 'Vidal', sector: 'Boca Sur' },
  { rut: '12.006.744-1', nombre1: 'Héctor', nombre2: 'Luis', apellido1: 'Painemal', sector: 'Amanecer' },
  { rut: '17.442.905-8', nombre1: 'Daniela', apellido1: 'Quezada', apellido2: 'Soto', sector: 'Pulmahue' },
  { rut: '15.330.271-4', nombre1: 'Marco', apellido1: 'Bustos', apellido2: 'Lagos', sector: 'Huequén' },
];

/**
 * Ancla temporal de una fila. `'hoy'`, `'semana'` (lunes de esta semana) y
 * `'mes'` (día 1 del mes en curso) están garantizados dentro del rango que
 * cuenta el dashboard; un número es "hace N días" y sirve para poblar el
 * histórico que debe quedar FUERA de esos contadores.
 */
type Ancla = 'hoy' | 'semana' | 'mes' | number;

// ── Pagos ───────────────────────────────────────────────────────────────────
// 18 filas. `cliente` es el RUT de `CLIENTES` o `null` para un pago sin
// conciliar — el caso que hace visible `cliente_existe=false`, que es
// justamente lo que el dashboard cuenta como "Sin Cliente Registrado".
//
// Los valores de `voucher_type`, `document_type` y `entry_user` salen de las
// listas del `payment_filter_config.py`: si acá se inventaran otros, el select
// del frontend ofrecería opciones que no matchean ninguna fila (el mismo error
// que R9 describe para las causas de órdenes).
const PAGOS: ReadonlyArray<{
  cliente: string | null;
  ancla: Ancla;
  credit: number;
  voucher_type: string;
  document_type: string;
  fiscal_year: number;
  entry_user: string;
}> = [
  // Hoy — tres pagos, dos conciliados y uno suelto.
  { cliente: '16.204.579-2', ancla: 'hoy', credit: 24990, voucher_type: 'INGRESO', document_type: 'BOLETAELEC', fiscal_year: 2026, entry_user: 'ADMIN' },
  { cliente: '13.871.402-5', ancla: 'hoy', credit: 18990, voucher_type: 'INGRESO', document_type: 'BOLETAELEC', fiscal_year: 2026, entry_user: 'CAJAVECINA' },
  { cliente: null, ancla: 'hoy', credit: 24990, voucher_type: 'INGRESO', document_type: 'BOLETA', fiscal_year: 2026, entry_user: 'CVECINA' },

  // Esta semana.
  { cliente: '19.553.118-K', ancla: 'semana', credit: 32990, voucher_type: 'INGRESO', document_type: 'BOLETAELECRS', fiscal_year: 2026, entry_user: 'ADMIN' },
  { cliente: '12.006.744-1', ancla: 'semana', credit: 18990, voucher_type: 'INGRESO', document_type: 'BOLETAELEC', fiscal_year: 2026, entry_user: 'SOPORTEGN' },
  { cliente: null, ancla: 'semana', credit: 45000, voucher_type: 'TRASPASO', document_type: 'FCA', fiscal_year: 2026, entry_user: 'USUARIOAPI' },

  // Este mes.
  { cliente: '17.442.905-8', ancla: 'mes', credit: 24990, voucher_type: 'INGRESO', document_type: 'BOLETAELEC', fiscal_year: 2026, entry_user: 'ADMIN' },
  { cliente: '15.330.271-4', ancla: 'mes', credit: 15990, voucher_type: 'INGRESO', document_type: 'BOLETA', fiscal_year: 2026, entry_user: 'QUILLECO' },
  { cliente: '16.204.579-2', ancla: 'mes', credit: 24990, voucher_type: 'INGRESO', document_type: 'BOLETAELEC', fiscal_year: 2026, entry_user: 'ADMIN' },
  { cliente: null, ancla: 'mes', credit: 12000, voucher_type: 'EGRESO', document_type: 'FVAELEC', fiscal_year: 2026, entry_user: 'adminyfinanz' },

  // Histórico — fuera de los tres contadores del dashboard, y con años
  // fiscales distintos para que el filtro `fiscalYear` tenga algo que partir.
  { cliente: '13.871.402-5', ancla: 40, credit: 18990, voucher_type: 'INGRESO', document_type: 'BOLETAELEC', fiscal_year: 2026, entry_user: 'CAJAVECINA' },
  { cliente: '19.553.118-K', ancla: 75, credit: 32990, voucher_type: 'INGRESO', document_type: 'BOLETAELECRS', fiscal_year: 2026, entry_user: 'IOLIVOS' },
  { cliente: '12.006.744-1', ancla: 130, credit: 18990, voucher_type: 'INGRESO', document_type: 'BOLETAELEC', fiscal_year: 2025, entry_user: 'MPARRA' },
  { cliente: null, ancla: 190, credit: 24990, voucher_type: 'INGRESO', document_type: 'BOLETA', fiscal_year: 2025, entry_user: 'tucahuep' },
  { cliente: '17.442.905-8', ancla: 240, credit: 15990, voucher_type: 'INGRESO', document_type: 'BOLETAELEC', fiscal_year: 2025, entry_user: 'LACOBOQ' },
  { cliente: '15.330.271-4', ancla: 320, credit: 24990, voucher_type: 'INGRESO', document_type: 'BOLETAELEC', fiscal_year: 2025, entry_user: 'canteras' },
  { cliente: '16.204.579-2', ancla: 400, credit: 22990, voucher_type: 'INGRESO', document_type: 'BOLETAELEC', fiscal_year: 2024, entry_user: 'CSOSA' },
  { cliente: null, ancla: 520, credit: 30000, voucher_type: 'TRASPASO', document_type: 'FCA', fiscal_year: 2024, entry_user: 'DjangoSimulator' },
];

// ── Transferencias ──────────────────────────────────────────────────────────
// 14 filas. `nombre` es el titular que informa el banco y NO siempre coincide
// con el del cliente: es lo que hace que la conciliación sea un trabajo manual
// y no un `JOIN`, y por eso el diálogo de asignar cliente existe.
//
// `estado` usa el literal `"Ok"` porque es el único valor que ofrecen los dos
// filtros del frontend (`estado` y `estado__not`). Las que no están en "Ok"
// llevan otros estados para que `estado__not=Ok` devuelva algo.
//
// `banco_origen` sale de `config/utils/bancos.py`, por la misma razón que los
// tipos de documento en pagos.
const TRANSFERENCIAS: ReadonlyArray<{
  cliente: string | null;
  ancla: Ancla;
  nombre: string;
  rut: string;
  banco: string;
  monto: number;
  estado: string;
  documento_pagado: boolean;
}> = [
  { cliente: '16.204.579-2', ancla: 'hoy', nombre: 'Camila Fuentes Rojas', rut: '16.204.579-2', banco: 'Banco De Chile', monto: 24990, estado: 'Ok', documento_pagado: true },
  { cliente: null, ancla: 'hoy', nombre: 'C. FUENTES R.', rut: '16.204.579-2', banco: 'Banco Del Estado De Chile', monto: 24990, estado: 'Pendiente', documento_pagado: false },
  { cliente: null, ancla: 'hoy', nombre: 'JOSE MIGUEL ARANEDA', rut: '18.771.203-6', banco: 'Mercado Pago Emisora S.a.', monto: 18990, estado: 'Pendiente', documento_pagado: false },

  { cliente: '13.871.402-5', ancla: 'semana', nombre: 'Rodrigo Sandoval', rut: '13.871.402-5', banco: 'Banco Santander-santiago', monto: 18990, estado: 'Ok', documento_pagado: true },
  { cliente: '19.553.118-K', ancla: 'semana', nombre: 'Javiera Contreras Vidal', rut: '19.553.118-K', banco: 'Banco Credito Inversiones', monto: 32990, estado: 'Ok', documento_pagado: false },
  { cliente: null, ancla: 'semana', nombre: 'M. ANGELICA SEPULVEDA', rut: '14.902.556-3', banco: 'Coopeuch', monto: 15990, estado: 'Rechazada', documento_pagado: false },

  { cliente: '12.006.744-1', ancla: 'mes', nombre: 'Hector Painemal', rut: '12.006.744-1', banco: 'Banco Falabella', monto: 18990, estado: 'Ok', documento_pagado: true },
  { cliente: '17.442.905-8', ancla: 'mes', nombre: 'Daniela Quezada S.', rut: '17.442.905-8', banco: 'Banco Bice', monto: 24990, estado: 'Ok', documento_pagado: false },
  { cliente: null, ancla: 'mes', nombre: 'TRANSFERENCIA SIN GLOSA', rut: '', banco: 'Tenpo Prepago S.a.', monto: 20000, estado: 'Pendiente', documento_pagado: false },

  { cliente: '15.330.271-4', ancla: 35, nombre: 'Marco Bustos Lagos', rut: '15.330.271-4', banco: 'Scotiabank Sud Americano', monto: 24990, estado: 'Ok', documento_pagado: true },
  { cliente: '16.204.579-2', ancla: 62, nombre: 'Camila Fuentes', rut: '16.204.579-2', banco: 'Banco De Chile', monto: 24990, estado: 'Ok', documento_pagado: true },
  { cliente: null, ancla: 110, nombre: 'PEDRO NOLASCO VERA', rut: '11.223.884-9', banco: 'Banco Itau Corpbanca', monto: 32990, estado: 'Rechazada', documento_pagado: false },
  { cliente: '19.553.118-K', ancla: 180, nombre: 'J. CONTRERAS', rut: '19.553.118-K', banco: 'Banco Security', monto: 32990, estado: 'Ok', documento_pagado: true },
  { cliente: null, ancla: 260, nombre: 'ROSA ELENA MILLAN', rut: '10.554.907-2', banco: 'Copec Pay', monto: 15990, estado: 'Pendiente', documento_pagado: false },
];

export async function sembrarPagosTransferencias(prisma: PrismaClient): Promise<void> {
  const idsPorRut = await sembrarClientesDePrueba(prisma);

  // Se borra ANTES de insertar y solo lo marcado. Ver la cabecera.
  const pagosBorrados = await prisma.pago.deleteMany({
    where: { folio_number: { startsWith: MARCA } },
  });
  const transferenciasBorradas = await prisma.transferencia.deleteMany({
    where: { codigo_transferencia: { startsWith: MARCA } },
  });

  await prisma.pago.createMany({
    data: PAGOS.map((pago, indice) => {
      const fecha = resolverFecha(pago.ancla);
      const cliente_id = pago.cliente ? (idsPorRut.get(pago.cliente) ?? null) : null;

      return {
        cliente_id,
        // El snapshot se guarda SIEMPRE, también en los pagos sin conciliar:
        // es el único dato que permite encontrarlos después, y es contra lo
        // que filtra `cliente_rut`.
        cliente_rut: pago.cliente,
        voucher_rut: pago.cliente,
        voucher_type: pago.voucher_type,
        voucher_number: 90000 + indice,
        fiscal_year: pago.fiscal_year,
        date: fecha,
        // `entry_date` es la fecha que filtra el dashboard (`entryDate_after`);
        // se siembra igual a `date` porque en los datos reales el desfase entre
        // el cobro y su carga es de horas, no de días.
        entry_date: fecha,
        entry_user: pago.entry_user,
        credit: pago.credit,
        document_type: pago.document_type,
        folio_number: `${MARCA}P${String(indice + 1).padStart(4, '0')}`,
        expiration_date: sumarDias(fecha, 30),
      };
    }),
  });

  await prisma.transferencia.createMany({
    data: TRANSFERENCIAS.map((transferencia, indice) => {
      const fecha = resolverFecha(transferencia.ancla);
      const cliente_id = transferencia.cliente
        ? (idsPorRut.get(transferencia.cliente) ?? null)
        : null;

      return {
        cliente_id,
        fecha,
        rut_transferencia: transferencia.rut || null,
        nombre: transferencia.nombre,
        banco_origen: transferencia.banco,
        cuenta_destino: '000-12345678-9',
        monto: transferencia.monto,
        estado: transferencia.estado,
        codigo_transferencia: `${MARCA}T${String(indice + 1).padStart(4, '0')}`,
        // `voucher_generado` queda null: lo produce `generar_voucher`, que es
        // de la Fase 9 y está bloqueado por R2.
        voucher_generado: null,
        documento_pagado: transferencia.documento_pagado,
        documento_venta: transferencia.documento_pagado
          ? `FV-${String(4200 + indice)}`
          : null,
        documento_vencimiento: transferencia.documento_pagado
          ? sumarDias(fecha, 30)
          : null,
      };
    }),
  });

  console.log(
    `· pagos: ${PAGOS.length} (${pagosBorrados.count} reemplazados) y ` +
      `transferencias: ${TRANSFERENCIAS.length} (${transferenciasBorradas.count} reemplazadas)`,
  );
}

/**
 * Clientes mínimos con su dirección principal. Devuelve `rut → id`.
 *
 * Estos SÍ se upsertean por `rut` (que es UNIQUE) en vez de borrarse y
 * recrearse: un cliente puede tener órdenes, servicios o direcciones cargados a
 * mano encima, y un seed no tiene por qué llevárselos puestos. El `update: {}`
 * es deliberado — si alguien editó el nombre desde la UI, el seed no lo pisa.
 */
async function sembrarClientesDePrueba(
  prisma: PrismaClient,
): Promise<Map<string, number>> {
  const idsPorRut = new Map<string, number>();

  for (const semilla of CLIENTES) {
    const cliente = await prisma.cliente.upsert({
      where: { rut: semilla.rut },
      create: {
        rut: semilla.rut,
        nombre1: semilla.nombre1,
        nombre2: semilla.nombre2 ?? null,
        apellido1: semilla.apellido1,
        apellido2: semilla.apellido2 ?? null,
        activo: true,
      },
      update: {},
    });

    idsPorRut.set(semilla.rut, cliente.id);
    await asegurarDireccionPrincipal(prisma, cliente.id, semilla.sector);
  }

  console.log(`· clientes de prueba: ${CLIENTES.length}`);
  return idsPorRut;
}

/**
 * Sin dirección principal, `cliente_sector` y `cliente_zona` salen vacíos y los
 * dos filtros de ubicación de ambas pantallas no devuelven nada (D4).
 *
 * No se usa `upsert`: el "máximo una principal por cliente" vive en un índice
 * único PARCIAL de la migración `init`, que Prisma no conoce y por lo tanto no
 * puede usar como `where`. Se busca y se decide a mano.
 */
async function asegurarDireccionPrincipal(
  prisma: PrismaClient,
  cliente_id: number,
  nombreSector: string,
): Promise<void> {
  const sector = await prisma.sector.findUnique({
    where: { sector: nombreSector },
    select: { id: true },
  });

  if (!sector) {
    console.warn(
      `  ⚠️  el sector "${nombreSector}" no existe: la dirección del cliente ` +
        `${cliente_id} queda sin sector y no va a matchear los filtros de ` +
        `ubicación. ¿Corriste el seed de zonas y sectores?`,
    );
  }

  const principal = await prisma.direccion.findFirst({
    where: { cliente_id, principal: true },
    select: { id: true },
  });

  if (principal) {
    await prisma.direccion.update({
      where: { id: principal.id },
      data: { sector_id: sector?.id ?? null },
    });
    return;
  }

  await prisma.direccion.create({
    data: {
      cliente_id,
      sector_id: sector?.id ?? null,
      principal: true,
      activo: true,
      direccion: `Calle ${nombreSector} 1234`,
    },
  });
}

// ── Fechas ──────────────────────────────────────────────────────────────────

/** Medianoche UTC de hoy. Ver la nota sobre zonas horarias en la cabecera. */
function hoyUTC(): Date {
  const fecha = new Date();
  fecha.setUTCHours(0, 0, 0, 0);
  return fecha;
}

function resolverFecha(ancla: Ancla): Date {
  if (typeof ancla === 'number') return sumarDias(hoyUTC(), -ancla);
  if (ancla === 'hoy') return hoyUTC();
  if (ancla === 'semana') return inicioDeSemana();
  return inicioDeMes();
}

/**
 * Lunes de la semana en curso — el mismo corte que usa el dashboard
 * (`today - timedelta(days=today.weekday())`). `getUTCDay()` devuelve 0 para
 * domingo, así que el domingo cuenta como el último día de la semana que
 * empezó el lunes anterior, no como el primero de la siguiente.
 */
function inicioDeSemana(): Date {
  const hoy = hoyUTC();
  const diaDeLaSemana = hoy.getUTCDay();
  const desdeElLunes = diaDeLaSemana === 0 ? 6 : diaDeLaSemana - 1;
  return sumarDias(hoy, -desdeElLunes);
}

function inicioDeMes(): Date {
  const hoy = hoyUTC();
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
}

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}
