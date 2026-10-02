const authService = require('../services/authService');
const { trackUsage } = require('./trackUsage');

const requireAuthRaw = async (req, res, next) => {
  const token = req.headers['authorization'] || req.body?.access_token;
  const player = await authService.getPlayerByToken(token);

  if (!player) {
    return res.status(401).json({ error: 'token invalido o no se mando token' });
  }

  req.player = player;
  next();
};

// se trackea aca para que los 401 tambien queden registrados
const requireAuth = trackUsage(requireAuthRaw);

module.exports = { requireAuth };
