const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Player extends Model {
  toJSON() {
    const valores = { ...this.get() };
    delete valores.password;
    delete valores.token;
    return valores;
  }
}

Player.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    wins: { type: DataTypes.INTEGER, defaultValue: 0 },
    password: { type: DataTypes.STRING, allowNull: true },
    token: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'Player', tableName: 'players' }
);

module.exports = Player;
