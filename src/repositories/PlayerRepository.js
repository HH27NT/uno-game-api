const Repository = require('./Repository');
const { Readable, Creatable, Updatable, Deletable } = require('./traits');
const { Player } = require('../models');

// lsp: misma forma que GameRepository y ScoreRepository, se pueden intercambiar sin romper nada
class PlayerRepository extends Deletable(Updatable(Creatable(Readable(Repository)))) {
  constructor() {
    super(Player);
  }

  findByUsername(username) {
    return this.findOne({ where: { username } });
  }

  findByToken(token) {
    return this.findOne({ where: { token } });
  }

  incrementWins(playerId, options) {
    return this.model.increment('wins', { where: { id: playerId }, ...options });
  }
}

module.exports = PlayerRepository;
