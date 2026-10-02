const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/players', require('./playerRoutes'));
router.use('/games', require('./gameRoutes'));
router.use('/turns', require('./turnRoutes'));
router.use('/cards', require('./cardRoutes'));
router.use('/scores', require('./scoreRoutes'));
router.use('/stats', require('./statsRoutes'));

module.exports = router;
