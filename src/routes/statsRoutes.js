const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// no se envuelven con trackUsage, no tiene sentido trackear las stats de las stats
router.get('/requests', statsController.getRequestStats);
router.get('/response-times', statsController.getResponseTimeStats);
router.get('/status-codes', statsController.getStatusCodeStats);
router.get('/popular-endpoints', statsController.getPopularEndpoints);

module.exports = router;
