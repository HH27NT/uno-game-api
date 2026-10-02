const cardService = require('../services/cardService');
const { sendResult } = require('../utils/httpResponse');

const getOne = async (req, res) => {
  const resultado = await cardService.getCardById(req.params.id);
  sendResult(res, resultado);
};

const getByGame = async (req, res) => {
  res.json(await cardService.getCardsByGame(req.params.gameId));
};

const update = async (req, res) => {
  const resultado = await cardService.updateCard(req.params.id, req.body);
  sendResult(res, resultado);
};

const remove = async (req, res) => {
  const resultado = await cardService.deleteCard(req.params.id);
  resultado.match({
    ok: () => res.status(204).send(),
    fail: ({ message, status }) => res.status(status).json({ error: message }),
  });
};

module.exports = { getOne, getByGame, update, remove };
