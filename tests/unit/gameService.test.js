jest.mock('../../src/services/cardService');
jest.mock('../../src/services/scoreService');

const cardService = require('../../src/services/cardService');
const scoreService = require('../../src/services/scoreService');
const { GameService } = require('../../src/services/gameService');

const jugadoresBase = [
  { id: 1, username: 'creador' },
  { id: 2, username: 'invitado' },
];

const makeGame = (overrides = {}) => ({
  id: 1,
  status: 'in_progress',
  direction: 1,
  currentPlayerIndex: 0,
  getPlayers: jest.fn().mockResolvedValue(jugadoresBase),
  update: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GameService', () => {
  test('getGameById regresa 404 si el repo no encuentra el juego', async () => {
    const gameRepo = { findByIdWithCards: jest.fn().mockResolvedValue(null) };

    const resultado = await new GameService(gameRepo, {}).getGameById(1);

    expect(resultado.success).toBe(false);
    expect(resultado.error.status).toBe(404);
  });

  test('getTopCard regresa 404 si todavia no hay carta en el descarte', async () => {
    const cardRepo = { findTopDiscard: jest.fn().mockResolvedValue(null) };

    const resultado = await new GameService({}, cardRepo).getTopCard(1);

    expect(resultado.success).toBe(false);
    expect(resultado.error.message).toBe('todavia no hay carta en el descarte');
  });

  test('joinGame falla con 400 si el juego no existe', async () => {
    const gameRepo = { findById: jest.fn().mockResolvedValue(null) };

    const resultado = await new GameService(gameRepo, {}).joinGame(999, { id: 1 });

    expect(resultado.success).toBe(false);
    expect(resultado.error.status).toBe(400);
  });

  test('joinGame falla si el juego ya esta lleno', async () => {
    const game = {
      status: 'waiting',
      maxPlayers: 1,
      hasPlayer: jest.fn().mockResolvedValue(false),
      countPlayers: jest.fn().mockResolvedValue(1),
    };
    const gameRepo = { findById: jest.fn().mockResolvedValue(game) };

    const resultado = await new GameService(gameRepo, {}).joinGame(1, { id: 5 });

    expect(resultado.success).toBe(false);
    expect(resultado.error.message).toBe('el juego ya esta lleno');
  });
});

describe('GameService.playCard', () => {
  test('falla si el juego no esta en curso', async () => {
    const gameRepo = { findById: jest.fn().mockResolvedValue(makeGame({ status: 'waiting' })) };

    const service = new GameService(gameRepo, {}, { create: jest.fn() }, {});
    const resultado = await service.playCard(1, jugadoresBase[0], 99);

    expect(resultado.success).toBe(false);
    expect(resultado.error.message).toBe('el juego no esta en curso');
  });

  test('falla si no es el turno del jugador', async () => {
    const gameRepo = { findById: jest.fn().mockResolvedValue(makeGame()) };

    const service = new GameService(gameRepo, {}, { create: jest.fn() }, {});
    const resultado = await service.playCard(1, jugadoresBase[1], 99);

    expect(resultado.success).toBe(false);
    expect(resultado.error.message).toBe('no es tu turno');
  });

  test('falla si la carta no esta en la mano del jugador', async () => {
    const gameRepo = { findById: jest.fn().mockResolvedValue(makeGame()) };
    const cardRepo = { findById: jest.fn().mockResolvedValue(null) };

    const service = new GameService(gameRepo, cardRepo, { create: jest.fn() }, {});
    const resultado = await service.playCard(1, jugadoresBase[0], 99);

    expect(resultado.success).toBe(false);
    expect(resultado.error.message).toBe('esa carta no esta en tu mano');
  });

  test('falla si la carta no hace match con la de arriba del descarte', async () => {
    const gameRepo = { findById: jest.fn().mockResolvedValue(makeGame()) };
    const carta = { id: 99, ownerId: 1, location: 'hand', color: 'red', type: 'number', value: 3 };
    const cardRepo = {
      findById: jest.fn().mockResolvedValue(carta),
      findTopDiscard: jest.fn().mockResolvedValue({ color: 'green', type: 'number', value: 7 }),
    };

    const service = new GameService(gameRepo, cardRepo, { create: jest.fn() }, {});
    const resultado = await service.playCard(1, jugadoresBase[0], 99);

    expect(resultado.success).toBe(false);
    expect(resultado.error.message).toMatch(/no coincide/);
  });

  test('exitoso: mueve la carta a descarte y pasa el turno al siguiente jugador', async () => {
    const game = makeGame();
    const gameRepo = { findById: jest.fn().mockResolvedValue(game) };
    const carta = { id: 99, ownerId: 1, location: 'hand', color: 'green', type: 'number', value: 7 };
    const cardRepo = {
      findById: jest.fn().mockResolvedValue(carta),
      findTopDiscard: jest.fn().mockResolvedValue({ color: 'green', type: 'number', value: 2 }),
      update: jest.fn(),
      countInHand: jest.fn().mockResolvedValue(3),
    };
    const moveRepo = { create: jest.fn() };
    const gamePlayerRepo = { setSaidUno: jest.fn() };

    const service = new GameService(gameRepo, cardRepo, moveRepo, gamePlayerRepo);
    const resultado = await service.playCard(1, jugadoresBase[0], 99);

    expect(resultado.success).toBe(true);
    expect(resultado.value.nextPlayer).toBe('invitado');
    expect(cardRepo.update).toHaveBeenCalledWith(99, { location: 'discard', ownerId: null, color: 'green' });
    expect(game.update).toHaveBeenCalledWith({ currentPlayerIndex: 1, direction: 1 });
    expect(moveRepo.create).toHaveBeenCalled();
  });

  test('un comodin exige elegir un color valido antes de jugarse', async () => {
    const gameRepo = { findById: jest.fn().mockResolvedValue(makeGame()) };
    const carta = { id: 99, ownerId: 1, location: 'hand', color: 'wild', type: 'wild', value: null };
    const cardRepo = {
      findById: jest.fn().mockResolvedValue(carta),
      findTopDiscard: jest.fn().mockResolvedValue({ color: 'green', type: 'number', value: 2 }),
    };

    const service = new GameService(gameRepo, cardRepo, { create: jest.fn() }, {});
    const resultado = await service.playCard(1, jugadoresBase[0], 99); // sin declared_color

    expect(resultado.success).toBe(false);
    expect(resultado.error.message).toMatch(/elegir un color/);
  });

  test('un comodin jugado con color declarado deja ese color en el descarte', async () => {
    const game = makeGame();
    const gameRepo = { findById: jest.fn().mockResolvedValue(game) };
    const carta = { id: 99, ownerId: 1, location: 'hand', color: 'wild', type: 'wild4', value: null };
    const cardRepo = {
      findById: jest.fn().mockResolvedValue(carta),
      findTopDiscard: jest.fn().mockResolvedValue({ color: 'green', type: 'number', value: 2 }),
      update: jest.fn(),
      countInHand: jest.fn().mockResolvedValue(3),
    };
    const moveRepo = { create: jest.fn() };
    const gamePlayerRepo = { setSaidUno: jest.fn() };

    const service = new GameService(gameRepo, cardRepo, moveRepo, gamePlayerRepo);
    const resultado = await service.playCard(1, jugadoresBase[0], 99, 'blue');

    expect(resultado.success).toBe(true);
    expect(cardRepo.update).toHaveBeenCalledWith(99, { location: 'discard', ownerId: null, color: 'blue' });
  });

  test('termina el juego y reparte puntaje si la mano queda vacia', async () => {
    const game = makeGame();
    const gameRepo = { findById: jest.fn().mockResolvedValue(game) };
    const carta = { id: 99, ownerId: 1, location: 'hand', color: 'green', type: 'number', value: 7 };
    const cardRepo = {
      findById: jest.fn().mockResolvedValue(carta),
      findTopDiscard: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      countInHand: jest.fn().mockResolvedValue(0),
    };
    const moveRepo = { create: jest.fn() };

    cardService.getHand.mockImplementation((gameId, playerId) =>
      Promise.resolve(playerId === 1 ? [] : [{ type: 'number', value: 4 }])
    );
    scoreService.createScore.mockResolvedValue({});

    const gamePlayerRepo = { setSaidUno: jest.fn() };
    const service = new GameService(gameRepo, cardRepo, moveRepo, gamePlayerRepo);
    const resultado = await service.playCard(1, jugadoresBase[0], 99);

    expect(resultado.success).toBe(true);
    expect(resultado.value.message).toBe('creador has won the game!');
    expect(resultado.value.scores).toEqual({ creador: 4, invitado: 0 });
    expect(game.update).toHaveBeenCalledWith({ status: 'finished' });
    expect(scoreService.createScore).toHaveBeenCalledTimes(2);
  });
});

describe('GameService.drawCard', () => {
  test('falla si el jugador tiene una carta jugable en la mano', async () => {
    const gameRepo = { findById: jest.fn().mockResolvedValue(makeGame()) };
    const cardRepo = { findTopDiscard: jest.fn().mockResolvedValue({ color: 'green', type: 'number', value: 7 }) };

    cardService.getHand.mockResolvedValue([{ color: 'green', type: 'number', value: 1 }]);

    const service = new GameService(gameRepo, cardRepo, { create: jest.fn() }, {});
    const resultado = await service.drawCard(1, jugadoresBase[0]);

    expect(resultado.success).toBe(false);
    expect(resultado.error.message).toMatch(/carta jugable/);
  });

  test('exitoso: roba una carta y pasa el turno', async () => {
    const game = makeGame();
    const gameRepo = { findById: jest.fn().mockResolvedValue(game) };
    const cardRepo = { findTopDiscard: jest.fn().mockResolvedValue({ color: 'green', type: 'number', value: 7 }) };

    cardService.getHand.mockResolvedValue([{ color: 'red', type: 'number', value: 1 }]);
    cardService.drawCardsForPlayer.mockResolvedValue([{ id: 55, color: 'blue', type: 'number', value: 2 }]);

    const service = new GameService(gameRepo, cardRepo, { create: jest.fn() }, {});
    const resultado = await service.drawCard(1, jugadoresBase[0]);

    expect(resultado.success).toBe(true);
    expect(resultado.value.cardDrawn.id).toBe(55);
    expect(game.update).toHaveBeenCalledWith({ currentPlayerIndex: 1, direction: 1 });
  });
});

describe('GameService.sayUno', () => {
  test('falla si no le queda exactamente una carta', async () => {
    cardService.getHand.mockResolvedValue([{}, {}]);

    const service = new GameService({}, {}, { create: jest.fn() }, {});
    const resultado = await service.sayUno(1, jugadoresBase[0]);

    expect(resultado.success).toBe(false);
  });

  test('marca saidUno en true cuando le queda una carta', async () => {
    cardService.getHand.mockResolvedValue([{}]);
    const gamePlayerRepo = { setSaidUno: jest.fn() };

    const service = new GameService({}, {}, { create: jest.fn() }, gamePlayerRepo);
    const resultado = await service.sayUno(1, jugadoresBase[0]);

    expect(resultado.success).toBe(true);
    expect(gamePlayerRepo.setSaidUno).toHaveBeenCalledWith(1, 1, true);
  });
});

describe('GameService.challengeUno', () => {
  test('falla si el desafiado ya habia dicho UNO', async () => {
    const gameRepo = { findById: jest.fn().mockResolvedValue(makeGame()) };
    const gamePlayerRepo = { findByGameAndPlayer: jest.fn().mockResolvedValue({ saidUno: true }) };
    cardService.getHand.mockResolvedValue([{}]);

    const service = new GameService(gameRepo, {}, { create: jest.fn() }, gamePlayerRepo);
    const resultado = await service.challengeUno(1, jugadoresBase[1], 1);

    expect(resultado.success).toBe(false);
    expect(resultado.error.message).toMatch(/said UNO on time/);
  });

  test('exitoso: el desafiado roba 2 cartas y pierde el turno', async () => {
    const game = makeGame();
    const gameRepo = { findById: jest.fn().mockResolvedValue(game) };
    const gamePlayerRepo = { findByGameAndPlayer: jest.fn().mockResolvedValue({ saidUno: false }) };
    cardService.getHand.mockResolvedValue([{}]);
    cardService.drawCardsForPlayer.mockResolvedValue([{}, {}]);

    const service = new GameService(gameRepo, {}, { create: jest.fn() }, gamePlayerRepo);
    const resultado = await service.challengeUno(1, jugadoresBase[1], 1);

    expect(resultado.success).toBe(true);
    expect(cardService.drawCardsForPlayer).toHaveBeenCalledWith(1, 1, 2);
    expect(resultado.value.nextPlayer).toBe('creador');
  });
});

describe('GameService.getGameState', () => {
  test('arma el estado completo: jugador actual, carta de arriba, manos e historial', async () => {
    const gameRepo = { findById: jest.fn().mockResolvedValue(makeGame()) };
    const cardRepo = { findTopDiscard: jest.fn().mockResolvedValue({ color: 'red', type: 'number', value: 3 }) };
    const moveRepo = {
      findByGame: jest.fn().mockResolvedValue([{ Player: { username: 'creador' }, action: 'jugo algo' }]),
    };

    cardService.getHand.mockImplementation((gameId, playerId) => Promise.resolve([{ id: playerId }]));

    const service = new GameService(gameRepo, cardRepo, moveRepo, {});
    const resultado = await service.getGameState(1);

    expect(resultado.success).toBe(true);
    expect(resultado.value.currentPlayer).toBe('creador');
    expect(resultado.value.hands.creador).toEqual([{ id: 1 }]);
    expect(resultado.value.hands.invitado).toEqual([{ id: 2 }]);
    expect(resultado.value.turnHistory).toEqual([{ player: 'creador', action: 'jugo algo' }]);
  });
});
