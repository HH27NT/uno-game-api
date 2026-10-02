const express = require('express');
const router = express.Router();
const { wrapController } = require('../middlewares/trackUsage');
const gameController = wrapController(require('../controllers/gameController'));
const { requireAuth } = require('../middlewares/auth');

// rutas fijas antes de /:id, si no express las confunde con un id
router.post('/join', requireAuth, gameController.join);
router.post('/start', requireAuth, gameController.start);
router.post('/leave', requireAuth, gameController.leave);
router.post('/end', requireAuth, gameController.end);

router.put('/play', requireAuth, gameController.playCard);
router.post('/draw', requireAuth, gameController.drawCard);
router.patch('/uno', requireAuth, gameController.sayUno);
router.post('/challenge', requireAuth, gameController.challenge);

router.get('/state', gameController.getState);
router.get('/players', gameController.getPlayers);
router.get('/current-player', gameController.getCurrentPlayer);
router.get('/top-card', gameController.getTopCard);
router.get('/scores', gameController.getScores);
router.get('/hand', requireAuth, gameController.getHand);
router.get('/history', gameController.getHistory);

router.post('/', requireAuth, gameController.create);
router.get('/', gameController.getAll);
router.get('/:id', gameController.getOne);
router.put('/:id', gameController.update);
router.delete('/:id', gameController.remove);

module.exports = router;
