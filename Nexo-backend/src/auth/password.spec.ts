import { hashPassword, verifyPassword, wastePasswordTime } from './password';

describe('hash de contraseñas (argon2id)', () => {
  // Un hash de 19 MiB tarda ~40 ms; varios seguidos se pasan del default de 5 s.
  jest.setTimeout(20_000);

  it('la contraseña correcta valida contra su hash', async () => {
    const hash = await hashPassword('sup3r-secreta');

    await expect(verifyPassword(hash, 'sup3r-secreta')).resolves.toBe(true);
  });

  it('una contraseña distinta no valida', async () => {
    const hash = await hashPassword('sup3r-secreta');

    await expect(verifyPassword(hash, 'sup3r-secretA')).resolves.toBe(false);
  });

  it('el hash es argon2id y trae sal propia (dos hashes distintos)', async () => {
    const [a, b] = await Promise.all([
      hashPassword('la-misma'),
      hashPassword('la-misma'),
    ]);

    expect(a).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(a).not.toBe(b);
  });

  it('un hash con otro formato no revienta: devuelve false', async () => {
    // Por ejemplo, un usuario importado de Django sin re-hashear.
    const django = 'pbkdf2_sha256$600000$abc$def';

    await expect(verifyPassword(django, 'lo-que-sea')).resolves.toBe(false);
    await expect(verifyPassword('', 'lo-que-sea')).resolves.toBe(false);
  });

  it('`wastePasswordTime` siempre da false y cuesta lo mismo que un verify real', async () => {
    const hash = await hashPassword('referencia');

    const t0 = performance.now();
    await verifyPassword(hash, 'referencia');
    const real = performance.now() - t0;

    await wastePasswordTime('cualquiera'); // primera llamada: calcula el dummy
    const t1 = performance.now();
    await expect(wastePasswordTime('cualquiera')).resolves.toBe(false);
    const falso = performance.now() - t1;

    // Umbral flojo a propósito: importa el orden de magnitud (que no sea ~0 ms
    // frente a ~40 ms), no la precisión — en CI los tiempos bailan.
    expect(falso).toBeGreaterThan(real / 4);
  });
});
