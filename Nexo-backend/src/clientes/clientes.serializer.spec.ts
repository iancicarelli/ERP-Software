import {
  ClienteConRelaciones,
  serializarCliente,
  soloFecha,
} from './clientes.serializer';

/**
 * El serializer es la traducción entre la base y lo que el frontend ya sabe
 * leer. Cada clave de acá aparece literal en `client_detail_dto.py` o en
 * `ClientTableState.transform_item()`; una que se caiga o cambie de nombre
 * rompe la pantalla sin ningún error visible.
 */

function fila(cambios: Partial<ClienteConRelaciones> = {}): ClienteConRelaciones {
  return {
    id: 42,
    rut: '16.204.579-2',
    rut_validado: true,
    nombre1: 'Juan',
    nombre2: 'Pedro',
    nombre3: null,
    apellido1: 'Huentelicán',
    apellido2: 'Soto',
    email: 'juan@example.cl',
    tel: '+56912345678',
    co_titular1: null,
    co_titular2: null,
    activo: true,
    por_instalar: false,
    moroso: false,
    moroso_desde: null,
    deuda: 0,
    monto_total: 19990,
    krill: false,
    defontana: true,
    zammad: false,
    cpes_todos: 2,
    cpes_inactivos: 0,
    fecha_creacion: new Date('2026-03-15T00:00:00.000Z'),
    fecha_de_baja: null,
    causa_de_baja_id: null,
    donacion: false,
    analogo: false,
    corte_poste: false,
    baja_por_renuncia: false,
    baja_por_morosidad: false,
    created_at: new Date('2026-03-15T12:00:00.000Z'),
    updated_at: new Date('2026-03-15T12:00:00.000Z'),
    causa_de_baja: null,
    direcciones: [
      {
        id: 7,
        cliente_id: 42,
        sector_id: 3,
        activo: true,
        principal: true,
        contrato: null,
        sucursal: null,
        direccion: 'Los Carrera 123',
        coordenadas: null,
        monto: 19990,
        created_at: new Date(),
        updated_at: new Date(),
        sector: {
          id: 3,
          sector: 'Gamboa',
          zona_id: 1,
          zona: { id: 1, zona: 'Castro' },
        },
      },
    ],
    ...cambios,
  } as ClienteConRelaciones;
}

describe('serializarCliente', () => {
  it('expone exactamente las claves que declara ClientDetailDTO', () => {
    expect(Object.keys(serializarCliente(fila())).sort()).toEqual(
      [
        'activo',
        'analogo',
        'apellido1',
        'apellido2',
        'baja_por_morosidad',
        'baja_por_renuncia',
        'causa_de_baja',
        'causa_de_baja_str',
        'co_titular1',
        'co_titular2',
        'corte_poste',
        'cpes_inactivos',
        'cpes_todos',
        'defontana',
        'deuda',
        'donacion',
        'email',
        'fecha_creacion',
        'fecha_de_baja',
        'id',
        'krill',
        'monto_total',
        'moroso',
        'moroso_desde',
        'nombre1',
        'nombre2',
        'nombre3',
        'por_instalar',
        'rut',
        'rut_validado',
        'sector',
        'tel',
        'zammad',
        'zona',
      ].sort(),
    );
  });

  it('incluye los campos que lee la TABLA (no solo el detalle)', () => {
    // `transform_item()` arma nombre_completo, estado, email, telefono y sector
    // con estas claves. Si falta alguna, la tabla se pinta vacía.
    const item = serializarCliente(fila());

    expect(item).toMatchObject({
      id: 42,
      rut: '16.204.579-2',
      nombre1: 'Juan',
      apellido1: 'Huentelicán',
      apellido2: 'Soto',
      email: 'juan@example.cl',
      tel: '+56912345678',
      sector: 'Gamboa',
      activo: true,
      por_instalar: false,
      moroso: false,
    });
  });

  describe('D4 — sector y zona salen de la dirección principal', () => {
    it('los resuelve desde la única dirección incluida', () => {
      expect(serializarCliente(fila())).toMatchObject({
        sector: 'Gamboa',
        zona: 'Castro',
      });
    });

    it('van en null si el cliente no tiene dirección principal', () => {
      const item = serializarCliente(fila({ direcciones: [] }));

      expect(item.sector).toBeNull();
      expect(item.zona).toBeNull();
    });

    it('van en null si la dirección principal no tiene sector', () => {
      const sinSector = fila();
      sinSector.direcciones[0].sector = null;

      const item = serializarCliente(sinSector);

      expect(item.sector).toBeNull();
      expect(item.zona).toBeNull();
    });
  });

  describe('causa de baja', () => {
    it('devuelve el id en `causa_de_baja` y la etiqueta en `causa_de_baja_str`', () => {
      const item = serializarCliente(
        fila({
          causa_de_baja_id: 5,
          causa_de_baja: { id: 5, causa: 'Por morosidad' },
        }),
      );

      // El frontend manda de vuelta el ID al guardar y muestra el texto.
      expect(item.causa_de_baja).toBe(5);
      expect(item.causa_de_baja_str).toBe('Por morosidad');
    });

    it('ambos en null cuando el cliente no está dado de baja', () => {
      const item = serializarCliente(fila());

      expect(item.causa_de_baja).toBeNull();
      expect(item.causa_de_baja_str).toBeNull();
    });
  });

  describe('fechas', () => {
    it('salen como AAAA-MM-DD, sin hora ni zona', () => {
      const item = serializarCliente(
        fila({
          moroso_desde: new Date('2026-01-31T00:00:00.000Z'),
          fecha_de_baja: new Date('2026-12-01T00:00:00.000Z'),
        }),
      );

      // `<input type="date">` solo acepta este formato.
      expect(item.fecha_creacion).toBe('2026-03-15');
      expect(item.moroso_desde).toBe('2026-01-31');
      expect(item.fecha_de_baja).toBe('2026-12-01');
    });

    it('`soloFecha` deja pasar el null', () => {
      expect(soloFecha(null)).toBeNull();
    });
  });

  it('no filtra columnas internas (created_at / updated_at)', () => {
    const item = serializarCliente(fila());

    expect(item).not.toHaveProperty('created_at');
    expect(item).not.toHaveProperty('updated_at');
    expect(item).not.toHaveProperty('causa_de_baja_id');
  });
});
