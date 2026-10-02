const { requireNextTurn, requirePlayTurn, requireDrawTurn } = require('../validators/turnValidators');
const { getNextTurn, resolvePlayCard, drawCard } = require('../utils/turnEngine');

const nextTurn = (req, res) => {
  const errorValidacion = requireNextTurn(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const { players, currentPlayerIndex } = req.body;
  res.status(200).json(getNextTurn(players, currentPlayerIndex));
};

const playCard = (req, res) => {
  const errorValidacion = requirePlayTurn(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const { type, ...resultado } = resolvePlayCard(req.body);
  res.status(200).json(resultado);
};

const drawTurnCard = (req, res) => {
  const errorValidacion = requireDrawTurn(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const { playerHand, deck, currentCard } = req.body;
  res.status(200).json(drawCard(playerHand, deck, currentCard));
};

module.exports = { nextTurn, playCard, drawTurnCard };
