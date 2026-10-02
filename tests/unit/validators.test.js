const { validateRegister, validateLogin } = require('../../src/validators/authValidators');
const { requireGameId } = require('../../src/validators/gameValidators');

describe('authValidators', () => {
  test('validateRegister pide los 3 campos', () => {
    expect(validateRegister({})).toBe('faltan datos obligatorios');
  });

  test('validateRegister pide password de minimo 6', () => {
    expect(validateRegister({ username: 'a', email: 'a@a.com', password: '123' })).toBe(
      'el password debe tener minimo 6 caracteres'
    );
  });

  test('validateRegister no regresa error si todo esta bien', () => {
    expect(validateRegister({ username: 'a', email: 'a@a.com', password: '123456' })).toBeNull();
  });

  test('validateLogin pide username y password', () => {
    expect(validateLogin({})).toBe('faltan username o password');
  });

  test('validateLogin no regresa error si todo esta bien', () => {
    expect(validateLogin({ username: 'a', password: '123456' })).toBeNull();
  });
});

describe('gameValidators', () => {
  test('requireGameId pide game_id', () => {
    expect(requireGameId({})).toBe('falta game_id');
  });

  test('requireGameId no regresa error si viene game_id', () => {
    expect(requireGameId({ game_id: 5 })).toBeNull();
  });
});
