import { nombreDelConstraint } from './prisma-meta';

/**
 * ============================================================================
 * `nombreDelConstraint()` — Fase 6
 * ----------------------------------------------------------------------------
 * Estos casos NO son inventados: los `meta` de abajo son los que devolvió
 * Prisma 6 al provocar los tres P2003 de `servicios` contra la base real.
 *
 * El test existe por un bug concreto: el proyecto leía `meta.field_name`, que
 * Prisma 6 dejó de emitir, y por eso `POST /api/direcciones/` con un sector
 * inexistente respondía "El cliente indicado no existe.". Si alguien vuelve a
 * atar el código a una sola forma del `meta`, esto se pone rojo.
 * ============================================================================
 */
describe('nombreDelConstraint', () => {
  it('lee `constraint` — la forma de Prisma 6', () => {
    expect(
      nombreDelConstraint({
        modelName: 'Servicio',
        constraint: 'servicios_elemento_id_fkey',
      }),
    ).toBe('servicios_elemento_id_fkey');
  });

  it('lee `field_name` — la forma vieja, por si se baja de versión', () => {
    expect(nombreDelConstraint({ field_name: 'servicios_cliente_id_fkey' })).toBe(
      'servicios_cliente_id_fkey',
    );
  });

  it('prefiere `constraint` cuando vienen las dos', () => {
    expect(
      nombreDelConstraint({ constraint: 'nuevo_fkey', field_name: 'viejo_fkey' }),
    ).toBe('nuevo_fkey');
  });

  it('devuelve "" en vez de "undefined" cuando no hay meta', () => {
    for (const vacio of [undefined, null, {}, 'texto', 42]) {
      expect(nombreDelConstraint(vacio)).toBe('');
    }
  });

  /**
   * El caso que rompía: `""` no incluye nada, así que todo `includes()` daba
   * false y el módulo culpaba al campo del `else`.
   */
  it('distingue las tres FK de servicios', () => {
    const cual = (constraint: string) => {
      const nombre = nombreDelConstraint({ constraint });
      return nombre.includes('elemento')
        ? 'elemento'
        : nombre.includes('direccion')
          ? 'direccion'
          : 'cliente';
    };

    expect(cual('servicios_elemento_id_fkey')).toBe('elemento');
    expect(cual('servicios_direccion_id_fkey')).toBe('direccion');
    expect(cual('servicios_cliente_id_fkey')).toBe('cliente');
  });
});
