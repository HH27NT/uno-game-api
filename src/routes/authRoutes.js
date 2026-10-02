const express = require('express');
const router = express.Router();
const { wrapController } = require('../middlewares/trackUsage');
const authController = wrapController(require('../controllers/authController'));
const { requireAuth } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/profile', requireAuth, authController.profile);

module.exports = router;
