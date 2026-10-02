const { ScoreService } = require('../../src/services/scoreService');

const fakeScoreRepo = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByPlayer: jest.fn(),
});
const fakePlayerRepo = () => ({ incrementWins: jest.fn() });
// simula sequelize.transaction
const fakeDb = { transaction: (fn) => fn({ fake: true }) };

describe('ScoreService', () => {
  test('createScore suma victoria al jugador si el resultado es win', async () => {
    const scoreRepo = fakeScoreRepo();
    const playerRepo = fakePlayerRepo();
    scoreRepo.create.mockResolvedValue({ id: 1, result: 'win' });

    const resultado = await new ScoreService(scoreRepo, playerRepo, fakeDb).createScore({
      playerId: 1,
      gameId: 1,
      points: 10,
      result: 'win',
    });

    expect(resultado.success).toBe(true);
    expect(playerRepo.incrementWins).toHaveBeenCalledWith(1, { transaction: { fake: true } });
  });

  test('createScore no suma victoria si el resultado es lose', async () => {
    const scoreRepo = fakeScoreRepo();
    const playerRepo = fakePlayerRepo();
    scoreRepo.create.mockResolvedValue({ id: 2, result: 'lose' });

    await new ScoreService(scoreRepo, playerRepo, fakeDb).createScore({
      playerId: 1,
      gameId: 1,
      points: 5,
      result: 'lose',
    });

    expect(playerRepo.incrementWins).not.toHaveBeenCalled();
  });

  test('createScore regresa Result.fail 400 si la transaccion truena', async () => {
    const scoreRepo = fakeScoreRepo();
    const playerRepo = fakePlayerRepo();
    scoreRepo.create.mockRejectedValue(new Error('fk invalida'));

    const resultado = await new ScoreService(scoreRepo, playerRepo, fakeDb).createScore({
      playerId: 999,
      gameId: 1,
      points: 5,
      result: 'win',
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error.message).toBe('fk invalida');
    expect(resultado.error.status).toBe(400);
  });

  test('getScoreById regresa 404 si no existe', async () => {
    const scoreRepo = fakeScoreRepo();
    scoreRepo.findById.mockResolvedValue(null);

    const resultado = await new ScoreService(scoreRepo, fakePlayerRepo(), fakeDb).getScoreById(999);

    expect(resultado.success).toBe(false);
    expect(resultado.error.status).toBe(404);
  });
});
