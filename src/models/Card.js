const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Card extends Model {}

Card.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    color: {
      type: DataTypes.ENUM('red', 'yellow', 'green', 'blue', 'wild'),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('number', 'skip', 'reverse', 'draw2', 'wild', 'wild4'),
      allowNull: false,
    },
    value: { type: DataTypes.INTEGER, allowNull: true }, // solo para type 'number'
    location: {
      type: DataTypes.ENUM('deck', 'hand', 'discard'),
      defaultValue: 'deck',
    },
  },
  { sequelize, modelName: 'Card', tableName: 'cards' }
);

module.exports = Card;
