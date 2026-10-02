const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Move extends Model {}

Move.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    gameId: { type: DataTypes.INTEGER, allowNull: false },
    playerId: { type: DataTypes.INTEGER, allowNull: true }, // null si la jugada la genera el sistema
    action: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Move', tableName: 'moves' }
);

module.exports = Move;
