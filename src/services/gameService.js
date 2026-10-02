const GameRepository = require('../repositories/GameRepository');
const CardRepository = require('../repositories/CardRepository');
const MoveRepository = require('../repositories/MoveRepository');
const GamePlayerRepository = require('../repositories/GamePlayerRepository');
const Result = require('../utils/result');
const cardService = require('./cardService');
const scoreService = require('./scoreService');
const gameEvents = require('../events/gameEvents');
const { queueGameTask } = require('../utils/gameQueue');
const { cardMatchesTop, hasPlayableCard, nextPlayerIndex } = require('../utils/gameRules');
const { computeFinalScores } = require('../utils/scoreCalculator');

class GameService {
  constructor(
    gameRepository = new GameRepository(),
    cardRepository = new CardRepository(),
    moveRepository = new MoveRepository(),
    gamePlayerRepository = new GamePlayerRepository()
  ) {
    this.gameRepository = gameRepository;
    this.cardRepository = cardRepository;
    this.moveRepository = moveRepository;
    this.gamePlayerRepository = gamePlayerRepository;
  }

  async createGame(data, creator) {
    try {
      const game = await this.gameRepository.create({
        name: data.name,
        maxPlayers: data.maxPlayers,
        creatorId: creator.id,
      });
      await cardService.initializeDeckForGame(game.id);
      await game.addPlayer(creator);
      return Result.ok(game);
    } catch (err) {
      return Result.fail(err.message, 400);
    }
  }

  async getGameById(id) {
    const game = await this.gameRepository.findByIdWithCards(id);
    if (!game) return Result.fail('juego no encontrado', 404);
    return Result.ok(game);
  }

  getAllGames() {
    return this.gameRepository.findAll();
  }

  async updateGame(id, data) {
    const game = await this.gameRepository.update(id, data);
    if (!game) return Result.fail('juego no encontrado', 404);
    return Result.ok(game);
  }

  async deleteGame(id) {
    const deleted = await this.gameRepository.delete(id);
    if (!deleted) return Result.fail('juego no encontrado', 404);
    return Result.ok(true);
  }

  // --- flujo de la partida ---

  async joinGame(gameId, player) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('el juego no existe', 400);
    if (game.status !== 'waiting') return Result.fail('el juego ya empezo, no se puede unir', 400);

    const yaEsta = await game.hasPlayer(player);
    if (yaEsta) return Result.fail('el jugador ya esta en este juego', 400);

    const totalJugadores = await game.countPlayers();
    if (totalJugadores >= game.maxPlayers) return Result.fail('el juego ya esta lleno', 400);

    await game.addPlayer(player);
    this.emitUpdate(gameId, 'player-joined', { player: player.username });
    return Result.ok(game);
  }

  async startGame(gameId, solicitante) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('el juego no existe', 400);
    if (game.creatorId !== solicitante.id) return Result.fail('solo el creador puede iniciar el juego', 400);
    if (game.status !== 'waiting') return Result.fail('el juego ya fue iniciado', 400);

    const jugadores = await game.getPlayers();
    if (jugadores.length < 2) return Result.fail('se necesitan al menos 2 jugadores para iniciar', 400);

    await cardService.dealHandsForGame(
      game.id,
      jugadores.map((j) => j.id)
    );
    await game.update({ status: 'in_progress', currentPlayerIndex: 0, direction: 1 });
    return Result.ok(game);
  }

  async leaveGame(gameId, player) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('el juego no existe', 400);

    const estaAdentro = await game.hasPlayer(player);
    if (!estaAdentro) return Result.fail('el jugador no pertenece a este juego', 400);

    await game.removePlayer(player);
    return Result.ok(game);
  }

  async endGame(gameId, solicitante) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('el juego no existe', 400);
    if (game.creatorId !== solicitante.id) return Result.fail('solo el creador puede finalizar el juego', 400);
    if (game.status === 'finished') return Result.fail('el juego ya habia terminado', 400);

    await game.update({ status: 'finished' });
    return Result.ok(game);
  }

  async getOrderedPlayers(gameId) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('juego no encontrado', 404);

    const jugadores = await game.getPlayers();
    return Result.ok([...jugadores].sort((a, b) => a.id - b.id));
  }

  async getGameState(gameId) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('juego no encontrado', 404);

    const jugadores = await this.getOrderedPlayers(gameId);
    const actual = await this.getCurrentPlayer(gameId);
    const topCard = await this.cardRepository.findTopDiscard(gameId);
    const movimientos = await this.moveRepository.findByGame(gameId, 10);

    const hands = {};
    if (jugadores.success) {
      await Promise.all(
        jugadores.value.map(async (jugador) => {
          hands[jugador.username] = await cardService.getHand(gameId, jugador.id);
        })
      );
    }

    return Result.ok({
      game,
      currentPlayer: actual.success ? actual.value.username : null,
      topCard,
      hands,
      turnHistory: movimientos.map((m) => ({
        player: m.Player ? m.Player.username : 'sistema',
        action: m.action,
      })),
    });
  }

  async getCurrentPlayer(gameId) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('juego no encontrado o sin jugadores', 404);

    const ordenados = await this.getOrderedPlayers(gameId);
    if (!ordenados.success || ordenados.value.length === 0) {
      return Result.fail('juego no encontrado o sin jugadores', 404);
    }

    const jugadores = ordenados.value;
    return Result.ok(jugadores[game.currentPlayerIndex % jugadores.length]);
  }

  async getTopCard(gameId) {
    const carta = await this.cardRepository.findTopDiscard(gameId);
    if (!carta) return Result.fail('todavia no hay carta en el descarte', 404);
    return Result.ok(carta);
  }

  async getCurrentScores(gameId) {
    const ordenados = await this.getOrderedPlayers(gameId);
    if (!ordenados.success) return Result.fail('juego no encontrado', 404);

    const puntuaciones = await Promise.all(
      ordenados.value.map(async (jugador) => {
        const cardsInHand = await this.cardRepository.countInHand(gameId, jugador.id);
        return { playerId: jugador.id, username: jugador.username, cardsInHand };
      })
    );
    return Result.ok(puntuaciones);
  }

  async getHand(gameId, player) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('el juego no existe', 404);

    const mano = await cardService.getHand(gameId, player.id);
    return Result.ok({ player: player.username, hand: mano });
  }

  async getHistory(gameId) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('el juego no existe', 404);

    const movimientos = await this.moveRepository.findByGame(gameId);
    return Result.ok(
      movimientos.map((m) => ({ player: m.Player ? m.Player.username : 'sistema', action: m.action }))
    );
  }

  // --- flujo de jugadas ---
  // play/draw/uno/challenge se encolan por gameId (gameQueue) para que dos jugadas del
  // mismo juego nunca corran en carrera, aunque distintos juegos si corren en paralelo

  playCard(gameId, player, cardId, declaredColor) {
    return queueGameTask(gameId, () => this._playCard(gameId, player, cardId, declaredColor));
  }

  async _playCard(gameId, player, cardId, declaredColor) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('el juego no existe', 400);
    if (game.status !== 'in_progress') return Result.fail('el juego no esta en curso', 400);

    const actual = await this.getCurrentPlayer(gameId);
    if (!actual.success || actual.value.id !== player.id) return Result.fail('no es tu turno', 400);

    const carta = await this.cardRepository.findById(cardId);
    if (!carta || carta.ownerId !== player.id || carta.location !== 'hand') {
      return Result.fail('esa carta no esta en tu mano', 400);
    }

    const topCard = await this.cardRepository.findTopDiscard(gameId);
    if (!cardMatchesTop(carta, topCard)) {
      return Result.fail('la carta no coincide con el color, numero o simbolo de la carta superior', 400);
    }

    // un comodin no tiene color propio: el jugador elige uno, y ese pasa a ser el color
    // de la carta superior del descarte para que el siguiente pueda hacer match por color
    const esComodin = carta.type === 'wild' || carta.type === 'wild4';
    if (esComodin && !['red', 'yellow', 'green', 'blue'].includes(declaredColor)) {
      return Result.fail('hay que elegir un color (red/yellow/green/blue) al jugar un comodin', 400);
    }
    const colorEnDescarte = esComodin ? declaredColor : carta.color;

    await this.cardRepository.update(carta.id, { location: 'discard', ownerId: null, color: colorEnDescarte });
    await this.gamePlayerRepository.setSaidUno(gameId, player.id, false);
    await this.recordMove(gameId, player.id, `jugo ${carta.color} ${carta.type}${carta.value != null ? ' ' + carta.value : ''}`);

    const manoRestante = await this.cardRepository.countInHand(gameId, player.id);
    if (manoRestante === 0) {
      return this._finishGame(game, player);
    }

    const jugadores = await this.getOrderedPlayers(gameId);
    const { index, direction } = nextPlayerIndex(
      jugadores.value.findIndex((j) => j.id === player.id),
      jugadores.value.length,
      game.direction,
      carta
    );
    await game.update({ currentPlayerIndex: index, direction });

    this.emitUpdate(gameId, 'card-played', { player: player.username, card: carta });

    return Result.ok({
      message: `${player.username} jugo la carta. Turno terminado.`,
      nextPlayer: jugadores.value[index].username,
    });
  }

  async _finishGame(game, winner) {
    const jugadores = await this.getOrderedPlayers(game.id);
    const manosPorJugador = await Promise.all(
      jugadores.value.map(async (j) => [j.id, await cardService.getHand(game.id, j.id)])
    );
    const handsByPlayerId = Object.fromEntries(manosPorJugador);
    const puntos = computeFinalScores(handsByPlayerId, winner.id);

    await game.update({ status: 'finished' });

    // sequelize.transaction() de sqlite no tolera bien varias transacciones en paralelo
    // sobre la misma conexion, asi que estas se crean una por una (a proposito, no Promise.all)
    for (const j of jugadores.value) {
      await scoreService.createScore({
        gameId: game.id,
        playerId: j.id,
        points: puntos[j.id] || 0,
        result: j.id === winner.id ? 'win' : 'lose',
      });
    }

    await this.recordMove(game.id, winner.id, 'gano la partida');
    const scoresPorUsername = Object.fromEntries(jugadores.value.map((j) => [j.username, puntos[j.id] || 0]));
    this.emitUpdate(game.id, 'game-over', { winner: winner.username, scores: scoresPorUsername });

    return Result.ok({ message: `${winner.username} has won the game!`, scores: scoresPorUsername });
  }

  drawCard(gameId, player) {
    return queueGameTask(gameId, () => this._drawCard(gameId, player));
  }

  async _drawCard(gameId, player) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('el juego no existe', 400);
    if (game.status !== 'in_progress') return Result.fail('el juego no esta en curso', 400);

    const actual = await this.getCurrentPlayer(gameId);
    if (!actual.success || actual.value.id !== player.id) return Result.fail('no es tu turno', 400);

    const mano = await cardService.getHand(gameId, player.id);
    const topCard = await this.cardRepository.findTopDiscard(gameId);
    if (hasPlayableCard(mano, topCard)) {
      return Result.fail('tenes una carta jugable, no podes robar', 400);
    }

    const [cartaRobada] = await cardService.drawCardsForPlayer(gameId, player.id, 1);
    if (!cartaRobada) return Result.fail('no quedan cartas para robar', 400);

    await this.recordMove(gameId, player.id, 'robo una carta del mazo');

    const jugadores = await this.getOrderedPlayers(gameId);
    const { index, direction } = nextPlayerIndex(
      jugadores.value.findIndex((j) => j.id === player.id),
      jugadores.value.length,
      game.direction,
      null
    );
    await game.update({ currentPlayerIndex: index, direction });

    this.emitUpdate(gameId, 'card-drawn', { player: player.username });

    return Result.ok({ message: `${player.username} drew a card from the deck. Turn ended.`, cardDrawn: cartaRobada });
  }

  async sayUno(gameId, player) {
    const mano = await cardService.getHand(gameId, player.id);
    if (mano.length !== 1) return Result.fail('solo podes decir UNO cuando te queda exactamente una carta', 400);

    await this.gamePlayerRepository.setSaidUno(gameId, player.id, true);
    await this.recordMove(gameId, player.id, 'dijo UNO');
    this.emitUpdate(gameId, 'uno-called', { player: player.username });

    return Result.ok({ message: `${player.username} said UNO successfully.` });
  }

  challengeUno(gameId, challenger, challengedPlayerId) {
    return queueGameTask(gameId, () => this._challengeUno(gameId, challenger, challengedPlayerId));
  }

  async _challengeUno(gameId, challenger, challengedPlayerId) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) return Result.fail('el juego no existe', 400);

    const jugadores = await this.getOrderedPlayers(gameId);
    const desafiado = jugadores.value.find((j) => j.id === Number(challengedPlayerId));
    if (!desafiado) return Result.fail('ese jugador no esta en la partida', 400);

    const fila = await this.gamePlayerRepository.findByGameAndPlayer(gameId, desafiado.id);
    const mano = await cardService.getHand(gameId, desafiado.id);

    if (mano.length !== 1 || (fila && fila.saidUno)) {
      return Result.fail(`Challenge failed. ${desafiado.username} said UNO on time.`, 400);
    }

    await cardService.drawCardsForPlayer(gameId, desafiado.id, 2);
    await this.recordMove(gameId, challenger.id, `desafio a ${desafiado.username} por no decir UNO`);

    // el desafio no le quita el turno a nadie por si solo, solo penaliza con 2 cartas;
    // se informa quien tiene el turno actual, sin tocar currentPlayerIndex
    const actual = await this.getCurrentPlayer(gameId);
    this.emitUpdate(gameId, 'uno-challenged', { challenger: challenger.username, challenged: desafiado.username });

    return Result.ok({
      message: `Challenge successful. ${desafiado.username} forgot to say UNO and draws 2 cards.`,
      nextPlayer: actual.success ? actual.value.username : null,
    });
  }

  recordMove(gameId, playerId, action) {
    return this.moveRepository.create({ gameId, playerId, action });
  }

  emitUpdate(gameId, type, payload) {
    gameEvents.emit('game:update', { gameId, type, payload });
  }
}

module.exports = new GameService();
module.exports.GameService = GameService;
