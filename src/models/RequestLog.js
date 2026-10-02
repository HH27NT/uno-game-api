const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class RequestLog extends Model {}

RequestLog.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    endpointAccess: { type: DataTypes.STRING, allowNull: false },
    requestMethod: { type: DataTypes.STRING, allowNull: false },
    statusCode: { type: DataTypes.INTEGER, allowNull: false },
    responseTime: { type: DataTypes.FLOAT, allowNull: false }, // ms
    timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    userId: { type: DataTypes.INTEGER, allowNull: true }, // null si no hay player autenticado
  },
  { sequelize, modelName: 'RequestLog', tableName: 'request_logs' }
);

module.exports = RequestLog;
