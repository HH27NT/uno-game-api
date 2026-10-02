const ScoreRepository = require('../repositories/ScoreRepository');
const PlayerRepository = require('../repositories/PlayerRepository');
const sequelize = require('../config/database');
const Result = require('../utils/result');

class ScoreService {
  constructor(scoreRepository = new ScoreRepository(), playerRepository = new PlayerRepository(), db = sequelize) {
    this.scoreRepository = scoreRepository;
    this.playerRepository = playerRepository;
    this.db = db;
  }

  async createScore(data) {
    try {
      const score = await this.db.transaction(async (t) => {
        const nuevo = await this.scoreRepository.create(data, { transaction: t });
        if (data.result === 'win') {
          await this.playerRepository.incrementWins(data.playerId, { transaction: t });
        }
        return nuevo;
      });
      return Result.ok(score);
    } catch (err) {
      return Result.fail(err.message, 400);
    }
  }

  async getScoreById(id) {
    const score = await this.scoreRepository.findById(id);
    if (!score) return Result.fail('score no encontrado', 404);
    return Result.ok(score);
  }

  async updateScore(id, data) {
    const score = await this.scoreRepository.update(id, data);
    if (!score) return Result.fail('score no encontrado', 404);
    return Result.ok(score);
  }

  async deleteScore(id) {
    const deleted = await this.scoreRepository.delete(id);
    if (!deleted) return Result.fail('score no encontrado', 404);
    return Result.ok(true);
  }

  getScoresByPlayer(playerId) {
    return this.scoreRepository.findByPlayer(playerId);
  }
}

module.exports = new ScoreService();
module.exports.ScoreService = ScoreService;
