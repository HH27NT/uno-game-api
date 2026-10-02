const express = require('express');
const router = express.Router();
const { wrapController } = require('../middlewares/trackUsage');
const turnController = wrapController(require('../controllers/turnController'));

router.post('/next-turn', turnController.nextTurn);
router.post('/play-card', turnController.playCard);
router.post('/draw-card', turnController.drawTurnCard);

module.exports = router;
