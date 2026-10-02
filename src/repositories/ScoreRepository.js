const Repository = require('./Repository');
const { Readable, Creatable, Updatable, Deletable } = require('./traits');
const { Score } = require('../models');

class ScoreRepository extends Deletable(Updatable(Creatable(Readable(Repository)))) {
  constructor() {
    super(Score);
  }

  findByPlayer(playerId) {
    return this.findAll({ where: { playerId } });
  }

  findByGame(gameId) {
    return this.findAll({ where: { gameId } });
  }
}

module.exports = ScoreRepository;
