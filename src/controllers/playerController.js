const playerService = require('../services/playerService');
const { sendResult } = require('../utils/httpResponse');

const create = async (req, res) => {
  const resultado = await playerService.createPlayer(req.body);
  sendResult(res, resultado, 201);
};

const getOne = async (req, res) => {
  const resultado = await playerService.getPlayerById(req.params.id);
  sendResult(res, resultado);
};

const getAll = async (req, res) => {
  res.json(await playerService.getAllPlayers());
};

const update = async (req, res) => {
  const resultado = await playerService.updatePlayer(req.params.id, req.body);
  sendResult(res, resultado);
};

const remove = async (req, res) => {
  const resultado = await playerService.deletePlayer(req.params.id);
  resultado.match({
    ok: () => res.status(204).send(),
    fail: ({ message, status }) => res.status(status).json({ error: message }),
  });
};

module.exports = { create, getOne, getAll, update, remove };
