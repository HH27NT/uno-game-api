// tests puros del monad Result, no toca nada de la app
const Result = require('../../src/utils/result');

describe('Result', () => {
  test('ok guarda el valor y success en true', () => {
    const r = Result.ok(5);
    expect(r.success).toBe(true);
    expect(r.value).toBe(5);
    expect(r.error).toBeNull();
  });

  test('fail guarda el mensaje y el status, success en false', () => {
    const r = Result.fail('algo trono', 404);
    expect(r.success).toBe(false);
    expect(r.error).toEqual({ message: 'algo trono', status: 404 });
  });

  test('fail usa 400 como status por default', () => {
    expect(Result.fail('mal').error.status).toBe(400);
  });

  test('map transforma el value si el result esta ok', () => {
    const r = Result.ok(2).map((x) => x * 10);
    expect(r.value).toBe(20);
  });

  test('map no hace nada si el result fallo', () => {
    const r = Result.fail('nel').map((x) => x * 10);
    expect(r.success).toBe(false);
    expect(r.value).toBeNull();
  });

  test('match llama a ok cuando el result esta bien', () => {
    const salida = Result.ok(7).match({ ok: (v) => `valor: ${v}`, fail: () => 'no deberia pasar' });
    expect(salida).toBe('valor: 7');
  });

  test('match llama a fail cuando el result esta mal', () => {
    const salida = Result.fail('ups', 400).match({ ok: () => 'no deberia pasar', fail: (e) => e.message });
    expect(salida).toBe('ups');
  });
});
