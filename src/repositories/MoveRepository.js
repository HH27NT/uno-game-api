const Repository = require('./Repository');
const { Readable, Creatable } = require('./traits');
const { Move, Player } = require('../models');

// isp: solo lectura + creacion, un movimiento nunca se edita ni se borra
class MoveRepository extends Creatable(Readable(Repository)) {
  constructor() {
    super(Move);
  }

  findByGame(gameId, limit) {
    return this.findAll({
      where: { gameId },
      order: [['createdAt', 'ASC']],
      limit,
      include: [{ model: Player, attributes: ['username'] }],
    });
  }
}

module.exports = MoveRepository;
