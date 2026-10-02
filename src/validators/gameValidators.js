const requireGameId = (source = {}) => {
  if (!source.game_id) return 'falta game_id';
  return null;
};

const requirePlayCard = (source = {}) => {
  if (!source.game_id) return 'falta game_id';
  if (!source.card_id) return 'falta card_id';
  return null;
};

const requireChallenge = (source = {}) => {
  if (!source.game_id) return 'falta game_id';
  if (!source.challenged_player_id) return 'falta challenged_player_id';
  return null;
};

module.exports = { requireGameId, requirePlayCard, requireChallenge };
