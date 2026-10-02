// cache en memoria para respuestas GET, con expiracion (maxAge) y limite de tamano (max)

const pipe = (...fns) => (input) => fns.reduce((value, fn) => fn(value), input);

const buildKey = (req) => `${req.method}:${req.originalUrl}`;

const memoize = ({ max = 50, maxAge = 30000 } = {}) => {
  const cache = {};

  const purgeExpired = (store) => {
    const now = Date.now();
    Object.keys(store)
      .filter((key) => store[key].expiresAt <= now)
      .forEach((key) => delete store[key]);
    return store;
  };

  // recorre las entradas y se queda con la de acceso mas viejo (para botarla si toca)
  const findOldestKey = (store) => {
    const keys = Object.keys(store);
    if (keys.length === 0) return null;
    return keys.reduce(
      (oldest, key) => (store[key].lastAccess < store[oldest].lastAccess ? key : oldest),
      keys[0]
    );
  };

  // si nos pasamos del tamano maximo, botamos la entrada menos usada recientemente
  const enforceMaxSize = (store) => {
    while (Object.keys(store).length > max) {
      const oldest = findOldestKey(store);
      if (!oldest) break;
      delete store[oldest];
    }
    return store;
  };

  const runHousekeeping = pipe(purgeExpired, enforceMaxSize);

  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    runHousekeeping(cache);

    const key = buildKey(req);
    const entry = cache[key];
    const now = Date.now();

    if (entry) {
      // hit: le reiniciamos el tiempo de vida y el acceso
      entry.lastAccess = now;
      entry.expiresAt = now + maxAge;
      res.set('X-Cache', 'HIT');
      return res.status(entry.status).json(entry.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400) {
        cache[key] = {
          body,
          status: res.statusCode,
          lastAccess: Date.now(),
          expiresAt: Date.now() + maxAge,
        };
        enforceMaxSize(cache);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

module.exports = memoize;
