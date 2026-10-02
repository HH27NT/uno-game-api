const express = require('express');
const router = express.Router();
const { wrapController, trackUsage } = require('../middlewares/trackUsage');
const playerController = wrapController(require('../controllers/playerController'));
const memoize = require('../middlewares/memoize');

// se trackea el cache tambien para que un HIT cuente igual que un MISS
const cache = trackUsage(memoize({ max: 50, maxAge: 30000 }));

router.post('/', playerController.create);
router.get('/', cache, playerController.getAll);
router.get('/:id', cache, playerController.getOne);
router.put('/:id', playerController.update);
router.delete('/:id', playerController.remove);

module.exports = router;
