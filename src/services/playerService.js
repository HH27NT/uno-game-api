const PlayerRepository = require('../repositories/PlayerRepository');
const Result = require('../utils/result');

// dip: el repo entra inyectado, no se hace require directo a sequelize aqui
class PlayerService {
  constructor(playerRepository = new PlayerRepository()) {
    this.playerRepository = playerRepository;
  }

  async createPlayer(data) {
    try {
      const player = await this.playerRepository.create(data);
      return Result.ok(player);
    } catch (err) {
      return Result.fail(err.message, 400);
    }
  }

  async getPlayerById(id) {
    const player = await this.playerRepository.findById(id);
    if (!player) return Result.fail('jugador no encontrado', 404);
    return Result.ok(player);
  }

  getAllPlayers() {
    return this.playerRepository.findAll();
  }

  async updatePlayer(id, data) {
    const player = await this.playerRepository.update(id, data);
    if (!player) return Result.fail('jugador no encontrado', 404);
    return Result.ok(player);
  }

  async deletePlayer(id) {
    const deleted = await this.playerRepository.delete(id);
    if (!deleted) return Result.fail('jugador no encontrado', 404);
    return Result.ok(true);
  }
}

module.exports = new PlayerService();
module.exports.PlayerService = PlayerService;
