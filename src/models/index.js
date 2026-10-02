const sequelize = require('../config/database');
const Player = require('./Player');
const Game = require('./Game');
const Card = require('./Card');
const Score = require('./Score');
const GamePlayer = require('./GamePlayer');
const Move = require('./Move');
const RequestLog = require('./RequestLog');

Game.hasMany(Card, { foreignKey: 'gameId', as: 'cards' });
Card.belongsTo(Game, { foreignKey: 'gameId' });

Player.hasMany(Card, { foreignKey: 'ownerId', as: 'hand' });
Card.belongsTo(Player, { foreignKey: 'ownerId', as: 'owner' });

Player.belongsToMany(Game, { through: GamePlayer, as: 'games', foreignKey: 'playerId', otherKey: 'gameId' });
Game.belongsToMany(Player, { through: GamePlayer, as: 'players', foreignKey: 'gameId', otherKey: 'playerId' });

Player.hasMany(Score, { foreignKey: 'playerId' });
Score.belongsTo(Player, { foreignKey: 'playerId' });
Game.hasMany(Score, { foreignKey: 'gameId' });
Score.belongsTo(Game, { foreignKey: 'gameId' });

Game.hasMany(Move, { foreignKey: 'gameId', as: 'moves' });
Move.belongsTo(Game, { foreignKey: 'gameId' });
Move.belongsTo(Player, { foreignKey: 'playerId' });

Player.hasMany(RequestLog, { foreignKey: 'userId' });
RequestLog.belongsTo(Player, { foreignKey: 'userId' });

module.exports = { sequelize, Player, Game, Card, Score, GamePlayer, Move, RequestLog };
