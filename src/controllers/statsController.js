const requestTrackingService = require('../services/requestTrackingService');

const getRequestStats = async (req, res) => {
  res.json(await requestTrackingService.getRequestStats());
};

const getResponseTimeStats = async (req, res) => {
  res.json(await requestTrackingService.getResponseTimeStats());
};

const getStatusCodeStats = async (req, res) => {
  res.json(await requestTrackingService.getStatusCodeStats());
};

const getPopularEndpoints = async (req, res) => {
  res.json(await requestTrackingService.getPopularEndpoints());
};

module.exports = { getRequestStats, getResponseTimeStats, getStatusCodeStats, getPopularEndpoints };
