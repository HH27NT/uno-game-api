// tests de las funciones de hash y token, tampoco tocan base de datos
const { hashPassword, verifyPassword, generateToken } = require('../src/utils/authUtils');

describe('hashPassword y verifyPassword', () => {
  test('el hash guardado no es igual al password original', () => {
    const hash = hashPassword('miClave123');
    expect(hash).not.toBe('miClave123');
  });

  test('verifyPassword regresa true si el password es el correcto', () => {
    const hash = hashPassword('miClave123');
    expect(verifyPassword('miClave123', hash)).toBe(true);
  });

  test('verifyPassword regresa false si el password es incorrecto', () => {
    const hash = hashPassword('miClave123');
    expect(verifyPassword('otraClave', hash)).toBe(false);
  });

  test('dos hashes del mismo password no quedan iguales (por el salt random)', () => {
    const hash1 = hashPassword('miClave123');
    const hash2 = hashPassword('miClave123');
    expect(hash1).not.toBe(hash2);
  });

  test('verifyPassword regresa false si no hay hash guardado', () => {
    expect(verifyPassword('cualquiera', null)).toBe(false);
  });

  test('verifyPassword regresa false si el hash guardado esta mal formado', () => {
    expect(verifyPassword('cualquiera', 'hashSinDosPuntos')).toBe(false);
  });
});

describe('generateToken', () => {
  test('genera un token distinto cada vez que se llama', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(token1).not.toBe(token2);
  });

  test('el token es un string no vacio', () => {
    const token = generateToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });
});
