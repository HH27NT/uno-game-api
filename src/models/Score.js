const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Score extends Model {}

Score.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    result: { type: DataTypes.ENUM('win', 'lose'), allowNull: false },
  },
  { sequelize, modelName: 'Score', tableName: 'scores' }
);

module.exports = Score;
