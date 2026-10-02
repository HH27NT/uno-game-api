const Repository = require('./Repository');
const { Readable, Creatable, Updatable, Deletable } = require('./traits');
const { Game } = require('../models');

class GameRepository extends Deletable(Updatable(Creatable(Readable(Repository)))) {
  constructor() {
    super(Game);
  }

  findByIdWithCards(id) {
    return this.model.findByPk(id, { include: ['cards'] });
  }
}

module.exports = GameRepository;
