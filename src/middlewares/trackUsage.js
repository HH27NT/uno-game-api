const requestTrackingService = require('../services/requestTrackingService');
const logger = require('../config/logger');

// baseUrl ya trae la barra, asi que route.path '/' no se pega tal cual (si no queda '.../games/')
const buildEndpointAccess = (req) => {
  if (!req.route) return req.baseUrl || req.path;
  return req.route.path === '/' ? req.baseUrl : `${req.baseUrl}${req.route.path}`;
};

const trackUsage = (handler) => (req, res, next) => {
  // evita guardar dos veces si una misma ruta pasa por mas de una capa envuelta (auth + controller)
  if (!res.locals.tracked) {
    res.locals.tracked = true;
    const inicio = process.hrtime.bigint();

    res.on('finish', () => {
      const responseTime = Number(process.hrtime.bigint() - inicio) / 1e6; // ms

      requestTrackingService
        .recordRequest({
          endpointAccess: buildEndpointAccess(req),
          requestMethod: req.method,
          statusCode: res.statusCode,
          responseTime,
          userId: req.player ? req.player.id : null,
        })
        .catch((err) => logger.error('no se pudo guardar el tracking de la request', { error: err.message }));
    });
  }

  return handler(req, res, next);
};

const wrapController = (controller) =>
  Object.entries(controller).reduce((wrapped, [nombre, fn]) => {
    wrapped[nombre] = trackUsage(fn);
    return wrapped;
  }, {});

module.exports = { trackUsage, wrapController };
