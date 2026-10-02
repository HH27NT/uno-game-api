const gameService = require('../services/gameService');
const { requireGameId, requirePlayCard, requireChallenge } = require('../validators/gameValidators');
const { sendResult } = require('../utils/httpResponse');

const create = async (req, res) => {
  const resultado = await gameService.createGame(req.body, req.player);
  sendResult(res, resultado, 201);
};

const getOne = async (req, res) => {
  const resultado = await gameService.getGameById(req.params.id);
  sendResult(res, resultado);
};

const getAll = async (req, res) => {
  res.json(await gameService.getAllGames());
};

const update = async (req, res) => {
  const resultado = await gameService.updateGame(req.params.id, req.body);
  sendResult(res, resultado);
};

const remove = async (req, res) => {
  const resultado = await gameService.deleteGame(req.params.id);
  resultado.match({
    ok: () => res.status(204).send(),
    fail: ({ message, status }) => res.status(status).json({ error: message }),
  });
};

// --- flujo de la partida ---

const join = async (req, res) => {
  const errorValidacion = requireGameId(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.joinGame(req.body.game_id, req.player);
  sendResult(res, resultado.map(() => ({ message: 'te uniste al juego correctamente' })));
};

const start = async (req, res) => {
  const errorValidacion = requireGameId(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.startGame(req.body.game_id, req.player);
  sendResult(res, resultado.map(() => ({ message: 'el juego empezo' })));
};

const leave = async (req, res) => {
  const errorValidacion = requireGameId(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.leaveGame(req.body.game_id, req.player);
  sendResult(res, resultado.map(() => ({ message: 'saliste del juego' })));
};

const end = async (req, res) => {
  const errorValidacion = requireGameId(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.endGame(req.body.game_id, req.player);
  sendResult(res, resultado.map(() => ({ message: 'el juego termino' })));
};

const getState = async (req, res) => {
  const errorValidacion = requireGameId(req.query);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.getGameState(req.query.game_id);
  sendResult(
    res,
    resultado.map(({ game, currentPlayer, topCard, hands, turnHistory }) => ({
      game_id: game.id,
      status: game.status,
      currentPlayer,
      topCard,
      hands,
      turnHistory,
    }))
  );
};

const getPlayers = async (req, res) => {
  const errorValidacion = requireGameId(req.query);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.getOrderedPlayers(req.query.game_id);
  sendResult(
    res,
    resultado.map((jugadores) => ({
      game_id: Number(req.query.game_id),
      players: jugadores.map((j) => ({ id: j.id, username: j.username })),
    }))
  );
};

const getCurrentPlayer = async (req, res) => {
  const errorValidacion = requireGameId(req.query);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.getCurrentPlayer(req.query.game_id);
  sendResult(
    res,
    resultado.map((jugador) => ({
      game_id: Number(req.query.game_id),
      current_player: { id: jugador.id, username: jugador.username },
    }))
  );
};

const getTopCard = async (req, res) => {
  const errorValidacion = requireGameId(req.query);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.getTopCard(req.query.game_id);
  sendResult(res, resultado.map((carta) => ({ game_id: Number(req.query.game_id), top_card: carta })));
};

const getScores = async (req, res) => {
  const errorValidacion = requireGameId(req.query);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.getCurrentScores(req.query.game_id);
  sendResult(res, resultado.map((scores) => ({ game_id: Number(req.query.game_id), scores })));
};

// --- flujo de jugadas ---

const playCard = async (req, res) => {
  const errorValidacion = requirePlayCard(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.playCard(req.body.game_id, req.player, req.body.card_id, req.body.declared_color);
  sendResult(res, resultado);
};

const drawCard = async (req, res) => {
  const errorValidacion = requireGameId(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.drawCard(req.body.game_id, req.player);
  sendResult(res, resultado);
};

const sayUno = async (req, res) => {
  const errorValidacion = requireGameId(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.sayUno(req.body.game_id, req.player);
  sendResult(res, resultado);
};

const challenge = async (req, res) => {
  const errorValidacion = requireChallenge(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.challengeUno(req.body.game_id, req.player, req.body.challenged_player_id);
  sendResult(res, resultado);
};

const getHand = async (req, res) => {
  const errorValidacion = requireGameId(req.query);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.getHand(req.query.game_id, req.player);
  sendResult(res, resultado);
};

const getHistory = async (req, res) => {
  const errorValidacion = requireGameId(req.query);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await gameService.getHistory(req.query.game_id);
  sendResult(res, resultado.map((history) => ({ game_id: Number(req.query.game_id), history })));
};

module.exports = {
  create,
  getOne,
  getAll,
  update,
  remove,
  join,
  start,
  leave,
  end,
  getState,
  getPlayers,
  getCurrentPlayer,
  getTopCard,
  getScores,
  playCard,
  drawCard,
  sayUno,
  challenge,
  getHand,
  getHistory,
};
