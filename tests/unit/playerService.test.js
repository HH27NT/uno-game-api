// repo falso inyectado, no toca sqlite
const { PlayerService } = require('../../src/services/playerService');

const fakeRepo = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('PlayerService', () => {
  test('getPlayerById regresa Result.fail 404 si el repo no encuentra nada', async () => {
    const repo = fakeRepo();
    repo.findById.mockResolvedValue(null);

    const resultado = await new PlayerService(repo).getPlayerById(999);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toEqual({ message: 'jugador no encontrado', status: 404 });
  });

  test('getPlayerById regresa Result.ok con el jugador si si existe', async () => {
    const repo = fakeRepo();
    repo.findById.mockResolvedValue({ id: 1, username: 'ana' });

    const resultado = await new PlayerService(repo).getPlayerById(1);

    expect(resultado.success).toBe(true);
    expect(resultado.value.username).toBe('ana');
  });

  test('createPlayer regresa Result.fail 400 si el repo truena (ej. username repetido)', async () => {
    const repo = fakeRepo();
    repo.create.mockRejectedValue(new Error('username repetido'));

    const resultado = await new PlayerService(repo).createPlayer({ username: 'ana' });

    expect(resultado.success).toBe(false);
    expect(resultado.error.message).toBe('username repetido');
    expect(resultado.error.status).toBe(400);
  });

  test('updatePlayer regresa Result.fail 404 si el repo no encuentra el jugador', async () => {
    const repo = fakeRepo();
    repo.update.mockResolvedValue(null);

    const resultado = await new PlayerService(repo).updatePlayer(999, { username: 'x' });

    expect(resultado.success).toBe(false);
    expect(resultado.error.status).toBe(404);
  });

  test('deletePlayer regresa Result.ok(true) si se borro', async () => {
    const repo = fakeRepo();
    repo.delete.mockResolvedValue(true);

    const resultado = await new PlayerService(repo).deletePlayer(1);

    expect(resultado.success).toBe(true);
    expect(resultado.value).toBe(true);
  });

  test('getAllPlayers delega directo en el repo', async () => {
    const repo = fakeRepo();
    repo.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const jugadores = await new PlayerService(repo).getAllPlayers();

    expect(jugadores).toHaveLength(2);
  });
});
