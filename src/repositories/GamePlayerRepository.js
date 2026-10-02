const Repository = require('./Repository');
const { Readable, Updatable } = require('./traits');
const { GamePlayer } = require('../models');

// isp: solo lectura + update, la fila se crea sola via game.addPlayer()
class GamePlayerRepository extends Updatable(Readable(Repository)) {
  constructor() {
    super(GamePlayer);
  }

  findByGameAndPlayer(gameId, playerId) {
    return this.findOne({ where: { gameId, playerId } });
  }

  async setSaidUno(gameId, playerId, saidUno) {
    const fila = await this.findByGameAndPlayer(gameId, playerId);
    if (!fila) return null;
    return fila.update({ saidUno });
  }
}

module.exports = GamePlayerRepository;
