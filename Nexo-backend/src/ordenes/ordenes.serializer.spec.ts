import {
  OrdenConRelaciones,
  serializarOrdenDetalle,
  serializarOrdenTabla,
} from './ordenes.serializer';

/**
 * ============================================================================
 * Los dos serializers contra los dos DTOs del frontend — Fase 7
 * ----------------------------------------------------------------------------
 * Fija clave por clave lo que espera `OrderDTO` (tabla) y lo que espera
 * `OrderDetailDTO` (detalle). Es la parte del contrato que más fácil se rompe
 * sin que nadie se entere: una clave que cambia de nombre no da error, deja la
 * columna vacía o el select en blanco.
 * ============================================================================
 */

const ORDEN: OrdenConRelaciones = {
  id: 6329,
  cliente_id: 42,

  koboid: 9001,
  koboid_serie: 12,
  kobo_asset_uid: 'aXyZ123',
  kobo_submission_time: new Date('2026-03-15T13:45:20.000Z'),

  rut: '16.204.579-2',
  nombre1: 'Juan',
  apellido1: 'Huentelicán',
  apellido2: 'Soto',
  email: 'juan@example.cl',
  tel: '+56911111111',

  contrato_nuevo: true,
  fecha_contrato: new Date('2026-03-01T00:00:00.000Z'),
  modificacion_plan: false,
  migracion: false,
  traslado: false,

  servicio_id: 3,
  anexos_extras: 2,
  anexos_extras_exterior: 1,
  sintonizadores: 0,
  extensores_wifi: 1,

  metros_extras: 30,
  costo_metros_extras: 15000,
  pago_instalacion: true,
  costo_instalacion: 25000,
  monto: 19990,

  direccion: 'Av. Siempreviva 742',
  direccion_id: null,
  coordenadas: '-36.82,-73.05',
  medidor_luz: true,
  ducto: false,
  metros_ducto: 0,
  poda: false,
  vecino: false,
  postacion: true,
  postes: 2,

  observacion_vendedor: 'Cliente pide instalación de mañana',
  observacion: null,

  abierto: true,
  evaluacion: false,
  estado_id: 2,
  causa_id: 5,
  bienvenida: false,

  comision: true,
  comision_pagada: false,
  fecha_pago: new Date('2026-04-10T00:00:00.000Z'),

  fecha_ingreso: new Date('2026-02-28T00:00:00.000Z'),
  fecha_programado: new Date('2026-03-20T14:30:00.000Z'),
  fecha_instalado: new Date('2026-03-21T09:15:00.000Z'),

  vendedor_id: 7,
  tecnico_id: 4,
  tecnico2: 'Ayudante Pérez',
  zona_id: 1,
  sector_id: 3,

  created_at: new Date(),
  updated_at: new Date(),

  estado: { id: 2, estado: 'Programado' },
  causa: { id: 5, causa: 'Falta de poda' },
  servicio: { id: 3, servicio: 'Plan Duo Superior' },
  vendedor: { id: 7, nombre1: 'Paulina', apellido1: 'Pino', apellido2: null, activo: true, usuario_id: null },
  tecnico: { id: 4, nombre1: 'Cristian', apellido1: 'Quiroz', apellido2: null, activo: true, usuario_id: null },
  zona: { id: 1, zona: 'Concepción' },
  sector: { id: 3, sector: 'Nonguén', zona_id: 1 },
};

describe('serializarOrdenTabla', () => {
  const fila = serializarOrdenTabla(ORDEN);

  it('emite exactamente las claves que lee `OrderDTO`', () => {
    // `nombre_completo` NO está: lo arma `transform_item()` concatenando.
    expect(Object.keys(fila).sort()).toEqual(
      [
        'abierto',
        'apellido1',
        'apellido2',
        'comision',
        'comision_pagada',
        'contrato_nuevo',
        'coordenadas',
        'costo_instalacion',
        'estado_estado',
        'fecha_contrato',
        'fecha_instalado',
        'fecha_programado',
        'id',
        'koboid',
        'migracion',
        'modificacion_plan',
        'nombre1',
        'pago_instalacion',
        'rut',
        'sector_str',
        'servicio_servicio',
        'tecnico_str',
        'traslado',
        'zona_str',
      ].sort(),
    );
  });

  it('usa los nombres de la VISTA DE TABLA para las etiquetas', () => {
    // `estado_estado`, no `estado_str`; `servicio_servicio`, no `servicio_str`.
    expect(fila).toMatchObject({
      estado_estado: 'Programado',
      servicio_servicio: 'Plan Duo Superior',
      zona_str: 'Concepción',
      sector_str: 'Nonguén',
      tecnico_str: 'Cristian Quiroz',
    });
  });

  it('`estado_estado` no puede venir vacío si hay estado', () => {
    // `_resolver_estado()` cae a "pendiente" si esta clave falta: la columna
    // Estado mostraría lo mismo para toda la tabla.
    expect(fila.estado_estado).toBe('Programado');
  });
});

describe('serializarOrdenDetalle', () => {
  const detalle = serializarOrdenDetalle(ORDEN);

  it('emite todas las claves que declara `OrderDetailDTO`', () => {
    const declaradasEnElDto = [
      'id', 'koboid', 'koboid_serie', 'kobo_asset_uid', 'kobo_submission_time',
      'contrato_nuevo', 'fecha_contrato',
      'rut', 'nombre1', 'apellido1', 'apellido2', 'email', 'tel',
      'modificacion_plan', 'migracion', 'traslado',
      'servicio_str',
      'anexos_extras', 'anexos_extras_exterior', 'sintonizadores', 'extensores_wifi',
      'metros_extras', 'costo_metros_extras', 'pago_instalacion', 'costo_instalacion',
      'coordenadas', 'medidor_luz', 'ducto', 'metros_ducto', 'poda', 'vecino',
      'postacion', 'postes',
      'observacion_vendedor', 'observacion',
      'abierto', 'evaluacion', 'estado_str', 'causa_str',
      'comision', 'comision_pagada', 'fecha_pago',
      'fecha_programado', 'fecha_instalado',
      'tecnico_str', 'tecnico2', 'vendedor_str',
      'zona_zona', 'zona_str', 'sector_sector', 'sector_str',
      'servicio', 'estado', 'zona', 'sector', 'vendedor', 'tecnico', 'causa',
      'direccion', 'bienvenida', 'monto',
    ];

    const faltantes = declaradasEnElDto.filter((clave) => !(clave in detalle));
    expect(faltantes).toEqual([]);
  });

  it('las FK salen como ENTERO además de como etiqueta', () => {
    // `hook_process_data()` copia estos enteros a `*_id`
    // (`orders_detail_state.py:44-56`). Sin ellos los selects abren vacíos y el
    // PUT siguiente mandaría las FK en null.
    expect(detalle).toMatchObject({
      servicio: 3,
      estado: 2,
      causa: 5,
      zona: 1,
      sector: 3,
      vendedor: 7,
      tecnico: 4,
    });
  });

  it('NO emite los `*_id`: los deriva el frontend', () => {
    // Emitirlos sería una segunda fuente de la misma verdad. El hook los
    // sincroniza desde el nombre plano.
    expect(detalle).not.toHaveProperty('servicio_id');
    expect(detalle).not.toHaveProperty('estado_id');
  });

  it('usa los nombres de la VISTA DE DETALLE y además los alias de tabla (R6)', () => {
    expect(detalle).toMatchObject({
      // los del detalle
      estado_str: 'Programado',
      servicio_str: 'Plan Duo Superior',
      causa_str: 'Falta de poda',
      vendedor_str: 'Paulina Pino',
      tecnico_str: 'Cristian Quiroz',
      zona_zona: 'Concepción',
      sector_sector: 'Nonguén',
      // y los de la tabla, para que ninguna vista dependa de quién la sirvió
      estado_estado: 'Programado',
      servicio_servicio: 'Plan Duo Superior',
      zona_str: 'Concepción',
      sector_str: 'Nonguén',
    });
  });

  it('`direccion` es el TEXTO libre, no la FK', () => {
    expect(detalle.direccion).toBe('Av. Siempreviva 742');
    expect(detalle).not.toHaveProperty('direccion_id');
  });

  describe('formato de fechas', () => {
    it('las columnas `@db.Date` salen como AAAA-MM-DD', () => {
      expect(detalle.fecha_contrato).toBe('2026-03-01');
      expect(detalle.fecha_pago).toBe('2026-04-10');
      expect(detalle.fecha_ingreso).toBe('2026-02-28');
    });

    it('`fecha_programado` sale con hora, para el input datetime-local', () => {
      // El form recorta a 16 caracteres; mandar segundos y zona lo rompería.
      expect(detalle.fecha_programado).toBe('2026-03-20T14:30');
    });

    it('`fecha_instalado` y `kobo_submission_time` también llevan hora', () => {
      // El frontend las trunca a 10 para pintarlas, pero la API no pierde el
      // dato: son `Timestamptz` en la base.
      expect(detalle.fecha_instalado).toBe('2026-03-21T09:15');
      expect(detalle.kobo_submission_time).toBe('2026-03-15T13:45');
    });
  });

  describe('orden sin relaciones asignadas', () => {
    const pelada = serializarOrdenDetalle({
      ...ORDEN,
      servicio_id: null, estado_id: null, causa_id: null,
      zona_id: null, sector_id: null, vendedor_id: null, tecnico_id: null,
      servicio: null, estado: null, causa: null,
      zona: null, sector: null, vendedor: null, tecnico: null,
      fecha_contrato: null, fecha_pago: null,
      fecha_programado: null, fecha_instalado: null, kobo_submission_time: null,
    });

    it('las etiquetas van en null, no en ""', () => {
      // Los campos del DTO son `Optional[str]`, así que el null valida.
      expect(pelada.estado_str).toBeNull();
      expect(pelada.tecnico_str).toBeNull();
      expect(pelada.zona_zona).toBeNull();
    });

    it('las FK van en null y el hook no las copia (solo copia > 0)', () => {
      expect(pelada.servicio).toBeNull();
      expect(pelada.vendedor).toBeNull();
    });

    it('las fechas vacías van en null', () => {
      expect(pelada.fecha_programado).toBeNull();
      expect(pelada.fecha_contrato).toBeNull();
    });

    it('el snapshot del cliente sobrevive igual (D9)', () => {
      // Es el punto de D9: la orden vale por sí sola aunque no tenga nada
      // enganchado.
      expect(pelada).toMatchObject({
        rut: '16.204.579-2',
        nombre1: 'Juan',
        apellido1: 'Huentelicán',
      });
    });
  });
});
