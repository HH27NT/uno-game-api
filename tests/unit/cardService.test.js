const { CardService } = require('../../src/services/cardService');

const fakeRepo = () => ({
  bulkCreate: jest.fn(),
  findById: jest.fn(),
  findByGame: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByGameAndLocation: jest.fn(),
});

describe('CardService', () => {
  test('getCardById regresa 404 si no existe', async () => {
    const repo = fakeRepo();
    repo.findById.mockResolvedValue(null);

    const resultado = await new CardService(repo).getCardById(1);

    expect(resultado.success).toBe(false);
    expect(resultado.error.status).toBe(404);
  });

  test('initializeDeckForGame manda las 108 cartas al repo con el gameId pegado', async () => {
    const repo = fakeRepo();
    repo.bulkCreate.mockResolvedValue([]);

    await new CardService(repo).initializeDeckForGame(7);

    const cartasMandadas = repo.bulkCreate.mock.calls[0][0];
    expect(cartasMandadas).toHaveLength(108);
    expect(cartasMandadas.every((carta) => carta.gameId === 7)).toBe(true);
  });

  test('dealHandsForGame reparte 7 cartas por jugador y voltea una carta al descarte', async () => {
    const repo = fakeRepo();
    const mazoFalso = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
    repo.findByGameAndLocation.mockResolvedValue(mazoFalso);
    repo.update.mockResolvedValue({});

    await new CardService(repo).dealHandsForGame(1, [10, 20]);

    // 7 cartas para cada uno de los 2 jugadores + 1 que se voltea al descarte = 15 updates
    expect(repo.update).toHaveBeenCalledTimes(15);
    expect(repo.update).toHaveBeenCalledWith(15, { location: 'discard' });
  });

  test('deleteCard regresa 404 si el repo no encuentra la carta', async () => {
    const repo = fakeRepo();
    repo.delete.mockResolvedValue(null);

    const resultado = await new CardService(repo).deleteCard(999);

    expect(resultado.success).toBe(false);
    expect(resultado.error.status).toBe(404);
  });

  describe('drawCardForPlayer', () => {
    test('roba la primera carta del mazo si hay cartas', async () => {
      const repo = fakeRepo();
      repo.findByGameAndLocation.mockResolvedValueOnce([{ id: 5 }, { id: 6 }]);
      repo.update.mockResolvedValue({});

      const carta = await new CardService(repo).drawCardForPlayer(1, 10);

      expect(carta.id).toBe(5);
      expect(repo.update).toHaveBeenCalledWith(5, { ownerId: 10, location: 'hand' });
    });

    test('si el mazo esta vacio, reshuffle del descarte antes de robar', async () => {
      const repo = fakeRepo();
      const descarte = [{ id: 100 }, { id: 1 }, { id: 2 }, { id: 3 }]; // 100 es la de arriba
      repo.findByGameAndLocation
        .mockResolvedValueOnce([]) // mazo vacio
        .mockResolvedValueOnce(descarte); // descarte para reshuffle
      repo.update.mockResolvedValue({});

      const carta = await new CardService(repo).drawCardForPlayer(1, 10);

      // se movieron las 3 cartas del descarte (menos la de arriba) de vuelta al mazo
      const updatesADeck = repo.update.mock.calls.filter(([, data]) => data.location === 'deck');
      expect(updatesADeck).toHaveLength(3);
      // y se robo una de esas
      expect(carta).toBeDefined();
    });

    test('si no hay cartas ni en el mazo ni en el descarte, regresa null', async () => {
      const repo = fakeRepo();
      repo.findByGameAndLocation.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const carta = await new CardService(repo).drawCardForPlayer(1, 10);

      expect(carta).toBeNull();
    });
  });

  describe('drawCardsForPlayer (recursivo)', () => {
    test('roba n cartas de forma secuencial, una por una', async () => {
      const repo = fakeRepo();
      const mazo = [{ id: 1 }, { id: 2 }, { id: 3 }];
      repo.findByGameAndLocation.mockImplementation(() => Promise.resolve(mazo.filter((c) => true)));
      repo.update.mockResolvedValue({});

      const service = new CardService(repo);
      const drawSpy = jest.spyOn(service, 'drawCardForPlayer');

      const cartas = await service.drawCardsForPlayer(1, 10, 2);

      expect(cartas).toHaveLength(2);
      expect(drawSpy).toHaveBeenCalledTimes(2);
    });

    test('con n=0 no roba nada', async () => {
      const repo = fakeRepo();
      const cartas = await new CardService(repo).drawCardsForPlayer(1, 10, 0);
      expect(cartas).toEqual([]);
    });
  });

  test('getHand pide las cartas en mano de un jugador especifico', async () => {
    const repo = fakeRepo();
    repo.findAll.mockResolvedValue([{ id: 1 }]);

    const mano = await new CardService(repo).getHand(1, 10);

    expect(repo.findAll).toHaveBeenCalledWith({ where: { gameId: 1, ownerId: 10, location: 'hand' } });
    expect(mano).toEqual([{ id: 1 }]);
  });
});
