const CardRepository = require('../repositories/CardRepository');
const Result = require('../utils/result');
const { generateDeck, shuffleDeck, dealCards, reshuffleDiscardIntoDeck } = require('../utils/deckUtils');

class CardService {
  constructor(cardRepository = new CardRepository()) {
    this.cardRepository = cardRepository;
  }

  initializeDeckForGame(gameId) {
    const deck = shuffleDeck(generateDeck());
    const cardsWithGameId = deck.map((card) => ({ ...card, gameId }));
    return this.cardRepository.bulkCreate(cardsWithGameId);
  }

  async getCardById(id) {
    const card = await this.cardRepository.findById(id);
    if (!card) return Result.fail('carta no encontrada', 404);
    return Result.ok(card);
  }

  getCardsByGame(gameId) {
    return this.cardRepository.findByGame(gameId);
  }

  async updateCard(id, data) {
    const card = await this.cardRepository.update(id, data);
    if (!card) return Result.fail('carta no encontrada', 404);
    return Result.ok(card);
  }

  async deleteCard(id) {
    const deleted = await this.cardRepository.delete(id);
    if (!deleted) return Result.fail('carta no encontrada', 404);
    return Result.ok(true);
  }

  async dealHandsForGame(gameId, playerIds, cardsPerPlayer = 7) {
    const mazo = await this.cardRepository.findByGameAndLocation(gameId, 'deck', [['id', 'ASC']]);

    // dealCards reparte de forma recursiva, ronda por ronda (ver deckUtils.dealRound)
    const { hands, remainingDeck } = dealCards(mazo, playerIds.length, cardsPerPlayer);

    const asignaciones = hands.flatMap((mano, jugadorIndex) =>
      mano.map((carta) => ({ id: carta.id, ownerId: playerIds[jugadorIndex] }))
    );

    await Promise.all(
      asignaciones.map(({ id, ownerId }) => this.cardRepository.update(id, { ownerId, location: 'hand' }))
    );

    const cartaInicial = remainingDeck[0];
    if (cartaInicial) {
      await this.cardRepository.update(cartaInicial.id, { location: 'discard' });
    }
  }

  getHand(gameId, playerId) {
    return this.cardRepository.findAll({ where: { gameId, ownerId: playerId, location: 'hand' } });
  }

  // si el mazo esta vacio, reshuffle recursivo del descarte antes de robar
  async drawCardForPlayer(gameId, playerId) {
    let mazo = await this.cardRepository.findByGameAndLocation(gameId, 'deck', [['id', 'ASC']]);

    if (mazo.length === 0) {
      const descarte = await this.cardRepository.findByGameAndLocation(gameId, 'discard', [['updatedAt', 'DESC']]);
      const { newDeck } = reshuffleDiscardIntoDeck(descarte);
      await Promise.all(newDeck.map((carta) => this.cardRepository.update(carta.id, { location: 'deck' })));
      mazo = newDeck;
    }

    if (mazo.length === 0) return null;

    const cartaRobada = mazo[0];
    await this.cardRepository.update(cartaRobada.id, { ownerId: playerId, location: 'hand' });
    return cartaRobada;
  }

  // roba n cartas de forma recursiva y secuencial (una espera a la otra a proposito:
  // asi nunca hay dos robos leyendo "la carta de arriba del mazo" al mismo tiempo)
  async drawCardsForPlayer(gameId, playerId, n) {
    if (n === 0) return [];
    const carta = await this.drawCardForPlayer(gameId, playerId);
    if (!carta) return [];
    const resto = await this.drawCardsForPlayer(gameId, playerId, n - 1);
    return [carta, ...resto];
  }
}

module.exports = new CardService();
module.exports.CardService = CardService;
