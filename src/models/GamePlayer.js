const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

// tabla intermedia Game<->Player, explicita porque necesitamos guardar si dijo "UNO"
class GamePlayer extends Model {}

GamePlayer.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    gameId: { type: DataTypes.INTEGER, allowNull: false },
    playerId: { type: DataTypes.INTEGER, allowNull: false },
    saidUno: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { sequelize, modelName: 'GamePlayer', tableName: 'GamePlayers' }
);

module.exports = GamePlayer;
