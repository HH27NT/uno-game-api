const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Game extends Model {}

Game.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: {
      type: DataTypes.ENUM('waiting', 'in_progress', 'finished'),
      defaultValue: 'waiting',
    },
    maxPlayers: { type: DataTypes.INTEGER, defaultValue: 4 },
    currentPlayerIndex: { type: DataTypes.INTEGER, defaultValue: 0 },
    direction: { type: DataTypes.INTEGER, defaultValue: 1 }, // 1 derecha, -1 izquierda
    name: { type: DataTypes.STRING, allowNull: true },
    creatorId: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: 'Game', tableName: 'games' }
);

module.exports = Game;
