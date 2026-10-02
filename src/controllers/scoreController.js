const scoreService = require('../services/scoreService');
const { sendResult } = require('../utils/httpResponse');

const create = async (req, res) => {
  const resultado = await scoreService.createScore(req.body);
  sendResult(res, resultado, 201);
};

const getOne = async (req, res) => {
  const resultado = await scoreService.getScoreById(req.params.id);
  sendResult(res, resultado);
};

const getByPlayer = async (req, res) => {
  res.json(await scoreService.getScoresByPlayer(req.params.playerId));
};

const update = async (req, res) => {
  const resultado = await scoreService.updateScore(req.params.id, req.body);
  sendResult(res, resultado);
};

const remove = async (req, res) => {
  const resultado = await scoreService.deleteScore(req.params.id);
  resultado.match({
    ok: () => res.status(204).send(),
    fail: ({ message, status }) => res.status(status).json({ error: message }),
  });
};

module.exports = { create, getOne, getByPlayer, update, remove };
