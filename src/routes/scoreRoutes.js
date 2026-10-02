const express = require('express');
const router = express.Router();
const { wrapController } = require('../middlewares/trackUsage');
const scoreController = wrapController(require('../controllers/scoreController'));

router.post('/', scoreController.create);
router.get('/player/:playerId', scoreController.getByPlayer);
router.get('/:id', scoreController.getOne);
router.put('/:id', scoreController.update);
router.delete('/:id', scoreController.remove);

module.exports = router;
