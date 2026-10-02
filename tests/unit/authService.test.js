const { AuthService } = require('../../src/services/authService');
const { hashPassword } = require('../../src/utils/authUtils');

const fakeRepo = () => ({
  findByUsername: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findByToken: jest.fn(),
});

describe('AuthService', () => {
  test('register falla con 409 si el username ya existe', async () => {
    const repo = fakeRepo();
    repo.findByUsername.mockResolvedValue({ id: 1 });

    const resultado = await new AuthService(repo).register({
      username: 'ana',
      email: 'a@a.com',
      password: '123456',
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error.status).toBe(409);
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('register guarda el password ya hasheado, no en texto plano', async () => {
    const repo = fakeRepo();
    repo.findByUsername.mockResolvedValue(null);
    repo.create.mockImplementation((data) => ({ id: 1, ...data }));

    const resultado = await new AuthService(repo).register({
      username: 'ana',
      email: 'a@a.com',
      password: '123456',
    });

    expect(resultado.success).toBe(true);
    const dataMandada = repo.create.mock.calls[0][0];
    expect(dataMandada.password).not.toBe('123456');
  });

  test('login falla con 401 si el usuario no existe', async () => {
    const repo = fakeRepo();
    repo.findByUsername.mockResolvedValue(null);

    const resultado = await new AuthService(repo).login('nadie', 'loquesea');

    expect(resultado.success).toBe(false);
    expect(resultado.error.status).toBe(401);
  });

  test('login falla con 401 si el password no coincide', async () => {
    const repo = fakeRepo();
    repo.findByUsername.mockResolvedValue({ id: 1, password: hashPassword('correcto123') });

    const resultado = await new AuthService(repo).login('ana', 'incorrecto');

    expect(resultado.success).toBe(false);
    expect(resultado.error.status).toBe(401);
  });

  test('login regresa un token si las credenciales son correctas', async () => {
    const repo = fakeRepo();
    repo.findByUsername.mockResolvedValue({ id: 1, password: hashPassword('correcto123') });
    repo.update.mockResolvedValue(true);

    const resultado = await new AuthService(repo).login('ana', 'correcto123');

    expect(resultado.success).toBe(true);
    expect(resultado.value.token).toBeDefined();
    expect(repo.update).toHaveBeenCalledWith(1, { token: resultado.value.token });
  });

  test('getPlayerByToken regresa null si no mandan token, sin tocar el repo', async () => {
    const repo = fakeRepo();
    const resultado = await new AuthService(repo).getPlayerByToken(null);

    expect(resultado).toBeNull();
    expect(repo.findByToken).not.toHaveBeenCalled();
  });

  test('toPublicProfile no incluye password ni token', () => {
    const perfil = new AuthService(fakeRepo()).toPublicProfile({
      id: 1,
      username: 'ana',
      email: 'a@a.com',
      wins: 2,
      password: 'hash',
      token: 'abc',
    });

    expect(perfil).toEqual({ id: 1, username: 'ana', email: 'a@a.com', wins: 2 });
  });
});
