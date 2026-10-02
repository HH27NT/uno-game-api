const Repository = require('./Repository');
const { Readable, Updatable, Deletable } = require('./traits');
const { Card } = require('../models');

// isp: no agarra Creatable, las cartas nunca se crean una por una
class CardRepository extends Deletable(Updatable(Readable(Repository))) {
  constructor() {
    super(Card);
  }

  bulkCreate(cards) {
    return this.model.bulkCreate(cards);
  }

  findByGame(gameId) {
    return this.findAll({ where: { gameId } });
  }

  findByGameAndLocation(gameId, location, order) {
    return this.findAll({ where: { gameId, location }, order });
  }

  countInHand(gameId, ownerId) {
    return this.model.count({ where: { gameId, ownerId, location: 'hand' } });
  }

  findTopDiscard(gameId) {
    return this.findOne({ where: { gameId, location: 'discard' }, order: [['updatedAt', 'DESC']] });
  }
}

module.exports = CardRepository;
