const requireNextTurn = (body = {}) => {
  if (!Array.isArray(body.players) || body.players.length === 0) return 'falta players';
  if (typeof body.currentPlayerIndex !== 'number') return 'falta currentPlayerIndex';
  return null;
};

const requirePlayTurn = (body = {}) => {
  if (typeof body.cardPlayed !== 'string' || !body.cardPlayed) return 'falta cardPlayed';
  if (!Array.isArray(body.players) || body.players.length === 0) return 'falta players';
  if (typeof body.currentPlayerIndex !== 'number') return 'falta currentPlayerIndex';
  if (!body.direction) return 'falta direction';
  return null;
};

const requireDrawTurn = (body = {}) => {
  if (!Array.isArray(body.playerHand)) return 'falta playerHand';
  if (!Array.isArray(body.deck)) return 'falta deck';
  if (typeof body.currentCard !== 'string' || !body.currentCard) return 'falta currentCard';
  return null;
};

module.exports = { requireNextTurn, requirePlayTurn, requireDrawTurn };
