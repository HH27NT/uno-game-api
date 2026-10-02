const express = require('express');
const router = express.Router();
const { wrapController, trackUsage } = require('../middlewares/trackUsage');
const cardController = wrapController(require('../controllers/cardController'));
const memoize = require('../middlewares/memoize');

// /game/:gameId no se cachea: las cartas cambian de lugar en cada jugada
const cache = trackUsage(memoize({ max: 50, maxAge: 30000 }));

router.get('/game/:gameId', cardController.getByGame);
router.get('/:id', cache, cardController.getOne);
router.put('/:id', cardController.update);
router.delete('/:id', cardController.remove);

module.exports = router;
