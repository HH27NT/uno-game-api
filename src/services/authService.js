const PlayerRepository = require('../repositories/PlayerRepository');
const Result = require('../utils/result');
const { hashPassword, verifyPassword, generateToken } = require('../utils/authUtils');

class AuthService {
  constructor(playerRepository = new PlayerRepository()) {
    this.playerRepository = playerRepository;
  }

  async register(data) {
    const existente = await this.playerRepository.findByUsername(data.username);
    if (existente) return Result.fail('ese username ya esta registrado', 409);

    try {
      const player = await this.playerRepository.create({
        username: data.username,
        email: data.email,
        password: hashPassword(data.password),
      });
      return Result.ok(player);
    } catch (err) {
      return Result.fail(err.message, 400);
    }
  }

  async login(username, password) {
    const player = await this.playerRepository.findByUsername(username);
    if (!player || !verifyPassword(password, player.password)) {
      return Result.fail('usuario o password invalidos', 401);
    }

    const token = generateToken();
    await this.playerRepository.update(player.id, { token });
    return Result.ok({ token, player });
  }

  logout(player) {
    return this.playerRepository.update(player.id, { token: null });
  }

  getPlayerByToken(token) {
    if (!token) return null;
    return this.playerRepository.findByToken(token);
  }

  toPublicProfile(player) {
    return { id: player.id, username: player.username, email: player.email, wins: player.wins };
  }
}

module.exports = new AuthService();
module.exports.AuthService = AuthService;
