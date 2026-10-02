jest.mock('../../src/services/requestTrackingService');

const { EventEmitter } = require('events');
const requestTrackingService = require('../../src/services/requestTrackingService');
const { trackUsage, wrapController } = require('../../src/middlewares/trackUsage');

const fakeRes = (statusCode = 200) => {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.locals = {};
  return res;
};

beforeEach(() => {
  requestTrackingService.recordRequest.mockReset().mockResolvedValue();
});

describe('trackUsage', () => {
  test('llama al handler original y registra la request cuando termina la respuesta', async () => {
    const controller = jest.fn((req, res) => res.emit('finish'));
    const req = { baseUrl: '/api/games', route: { path: '/' }, method: 'GET' };
    const res = fakeRes(200);

    trackUsage(controller)(req, res);

    expect(controller).toHaveBeenCalledWith(req, res, undefined);
    expect(requestTrackingService.recordRequest).toHaveBeenCalledTimes(1);
    expect(requestTrackingService.recordRequest).toHaveBeenCalledWith(
      expect.objectContaining({ endpointAccess: '/api/games', requestMethod: 'GET', statusCode: 200, userId: null })
    );
  });

  test('no arrastra la barra de route.path "/" (evita "/api/games/" en la ruta raiz)', () => {
    const req = { baseUrl: '/api/games', route: { path: '/' }, method: 'GET' };
    const res = fakeRes(200);

    trackUsage((r, s) => s.emit('finish'))(req, res);

    expect(requestTrackingService.recordRequest).toHaveBeenCalledWith(
      expect.objectContaining({ endpointAccess: '/api/games' })
    );
  });

  test('usa req.player.id como userId cuando la request esta autenticada', () => {
    const req = { baseUrl: '/api/games', route: { path: '/:id' }, method: 'GET', player: { id: 7 } };
    const res = fakeRes(200);

    trackUsage((r, s) => s.emit('finish'))(req, res);

    expect(requestTrackingService.recordRequest).toHaveBeenCalledWith(expect.objectContaining({ userId: 7 }));
  });

  test('no guarda dos veces si dos capas de la misma ruta estan envueltas (guard + controller)', () => {
    const req = { baseUrl: '/api/games', route: { path: '/join' }, method: 'POST' };
    const res = fakeRes(201);

    const controller = jest.fn();
    const guardEnvuelto = trackUsage((r, s, next) => next());
    const controllerEnvuelto = trackUsage(controller);

    guardEnvuelto(req, res, () => controllerEnvuelto(req, res));
    res.emit('finish');

    expect(controller).toHaveBeenCalledTimes(1);
    expect(requestTrackingService.recordRequest).toHaveBeenCalledTimes(1);
  });

  test('cae a req.path si la ruta no matcheo (ej. 404)', () => {
    const req = { baseUrl: '', route: null, path: '/ruta-inexistente', method: 'GET' };
    const res = fakeRes(404);

    trackUsage((r, s) => s.emit('finish'))(req, res);

    expect(requestTrackingService.recordRequest).toHaveBeenCalledWith(
      expect.objectContaining({ endpointAccess: '/ruta-inexistente', statusCode: 404 })
    );
  });
});

describe('wrapController', () => {
  test('envuelve todos los metodos del controller preservando sus nombres', () => {
    const controller = { getAll: jest.fn(), getOne: jest.fn() };
    const envuelto = wrapController(controller);

    expect(Object.keys(envuelto).sort()).toEqual(['getAll', 'getOne']);
    expect(typeof envuelto.getAll).toBe('function');
    expect(envuelto.getAll).not.toBe(controller.getAll);
  });
});
