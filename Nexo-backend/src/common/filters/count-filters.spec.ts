import {
  mergeCountClauses,
  RawQueryRunner,
  resolveCountFilters,
} from './count-filters';
import { CountFilterRequest } from './filter-map.types';

const relation = {
  table: 'direcciones',
  groupBy: 'cliente_id',
  targetField: 'id',
};

/** Prisma falso: registra el SQL y los parámetros, devuelve ids fijos. */
function runnerReturning(ids: number[]): RawQueryRunner & {
  calls: { sql: string; params: unknown[] }[];
} {
  const calls: { sql: string; params: unknown[] }[] = [];
  return {
    calls,
    $queryRawUnsafe: jest.fn(async (sql: string, ...params: unknown[]) => {
      calls.push({ sql, params });
      return ids.map((id) => ({ target_id: id })) as never;
    }),
  };
}

function request(overrides: Partial<CountFilterRequest>): CountFilterRequest {
  return { relation, ...overrides };
}

describe('resolveCountFilters', () => {
  it('un mínimo positivo se resuelve con `HAVING COUNT(*) >=` y un `in`', async () => {
    const db = runnerReturning([1, 7]);

    const clauses = await resolveCountFilters(db, [request({ min: 2 })]);

    expect(db.calls[0].sql).toBe(
      'SELECT "cliente_id" AS target_id FROM "direcciones" ' +
        'WHERE "cliente_id" IS NOT NULL ' +
        'GROUP BY "cliente_id" ' +
        'HAVING COUNT(*) >= $1',
    );
    expect(db.calls[0].params).toEqual([2]);
    expect(clauses).toEqual([{ id: { in: [1, 7] } }]);
  });

  it('mínimo y máximo se combinan en un solo HAVING', async () => {
    const db = runnerReturning([3]);

    await resolveCountFilters(db, [request({ min: 2, max: 5 })]);

    expect(db.calls[0].sql).toContain('HAVING COUNT(*) >= $1 AND COUNT(*) <= $2');
    expect(db.calls[0].params).toEqual([2, 5]);
  });

  it('un máximo sin mínimo va por el COMPLEMENTO', async () => {
    // Clave: un cliente con CERO direcciones no aparece en un GROUP BY, así
    // que preguntar `COUNT(*) <= 3` lo dejaría afuera aunque cumple. Se busca
    // a los que se pasan y se los excluye.
    const db = runnerReturning([9]);

    const clauses = await resolveCountFilters(db, [request({ max: 3 })]);

    expect(db.calls[0].sql).toContain('HAVING COUNT(*) > $1');
    expect(db.calls[0].params).toEqual([3]);
    expect(clauses).toEqual([{ NOT: { id: { in: [9] } } }]);
  });

  it('un mínimo de 0 con máximo también va por el complemento', async () => {
    const db = runnerReturning([9]);

    const clauses = await resolveCountFilters(db, [request({ min: 0, max: 3 })]);

    expect(db.calls[0].params).toEqual([3]);
    expect(clauses).toEqual([{ NOT: { id: { in: [9] } } }]);
  });

  it('un mínimo de 0 sin máximo no restringe nada', async () => {
    const db = runnerReturning([1]);

    expect(await resolveCountFilters(db, [request({ min: 0 })])).toEqual([]);
    expect(db.calls).toHaveLength(0);
  });

  it('`= 0` excluye a los que tienen al menos una fila relacionada', async () => {
    const db = runnerReturning([4, 5]);

    const clauses = await resolveCountFilters(db, [request({ equals: 0 })]);

    expect(db.calls[0].params).toEqual([1]);
    expect(clauses).toEqual([{ NOT: { id: { in: [4, 5] } } }]);
  });

  it('un conteo exacto positivo usa `COUNT(*) =`', async () => {
    const db = runnerReturning([2]);

    const clauses = await resolveCountFilters(db, [request({ equals: 3 })]);

    expect(db.calls[0].sql).toContain('HAVING COUNT(*) = $1');
    expect(db.calls[0].params).toEqual([3]);
    expect(clauses).toEqual([{ id: { in: [2] } }]);
  });

  it('un resultado vacío con `in` no matchea nada', async () => {
    const db = runnerReturning([]);
    expect(await resolveCountFilters(db, [request({ min: 2 })])).toEqual([
      { id: { in: [] } },
    ]);
  });

  it('normaliza los ids que Postgres devuelve como bigint', async () => {
    const db: RawQueryRunner = {
      $queryRawUnsafe: jest.fn(async () => [{ target_id: 42n }] as never),
    };
    expect(await resolveCountFilters(db, [request({ min: 1 })])).toEqual([
      { id: { in: [42] } },
    ]);
  });

  it('rechaza identificadores que no sean nombres SQL simples', async () => {
    const db = runnerReturning([]);

    await expect(
      resolveCountFilters(db, [
        {
          relation: {
            table: 'direcciones"; DROP TABLE clientes; --',
            groupBy: 'cliente_id',
            targetField: 'id',
          },
          min: 1,
        },
      ]),
    ).rejects.toThrow('Identificador SQL inválido');
  });
});

describe('mergeCountClauses', () => {
  it('devuelve el where intacto si no hay cláusulas', () => {
    const where = { AND: [{ activo: true }] };
    expect(mergeCountClauses(where, [])).toBe(where);
  });

  it('suma las cláusulas al AND existente', () => {
    expect(
      mergeCountClauses({ AND: [{ activo: true }] }, [{ id: { in: [1] } }]),
    ).toEqual({ AND: [{ activo: true }, { id: { in: [1] } }] });
  });

  it('crea el AND si el where estaba vacío', () => {
    expect(mergeCountClauses({}, [{ id: { in: [1] } }])).toEqual({
      AND: [{ id: { in: [1] } }],
    });
  });
});
