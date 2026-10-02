const { RequestTrackingService } = require('../../src/services/requestTrackingService');

const fakeLog = (overrides) => ({
  endpointAccess: '/api/games',
  requestMethod: 'GET',
  statusCode: 200,
  responseTime: 100,
  userId: null,
  ...overrides,
});

const fakeRepo = (logs) => ({
  create: jest.fn(),
  findAll: jest.fn().mockResolvedValue(logs),
});

describe('RequestTrackingService', () => {
  test('recordRequest delega en el repo, con userId null si no viene', async () => {
    const repo = fakeRepo([]);
    await new RequestTrackingService(repo).recordRequest({
      endpointAccess: '/api/games',
      requestMethod: 'GET',
      statusCode: 200,
      responseTime: 50,
    });

    expect(repo.create).toHaveBeenCalledWith({
      endpointAccess: '/api/games',
      requestMethod: 'GET',
      statusCode: 200,
      responseTime: 50,
      userId: null,
    });
  });

  test('getRequestStats cuenta el total y desglosa por endpoint + metodo', async () => {
    const logs = [
      fakeLog({ endpointAccess: '/api/games', requestMethod: 'GET' }),
      fakeLog({ endpointAccess: '/api/games', requestMethod: 'GET' }),
      fakeLog({ endpointAccess: '/api/games', requestMethod: 'POST' }),
      fakeLog({ endpointAccess: '/api/players', requestMethod: 'GET' }),
    ];

    const resultado = await new RequestTrackingService(fakeRepo(logs)).getRequestStats();

    expect(resultado.total_requests).toBe(4);
    expect(resultado.breakdown).toEqual({
      '/api/games': { GET: 2, POST: 1 },
      '/api/players': { GET: 1 },
    });
  });

  test('getResponseTimeStats calcula avg/min/max por endpoint', async () => {
    const logs = [
      fakeLog({ endpointAccess: '/api/games', responseTime: 50 }),
      fakeLog({ endpointAccess: '/api/games', responseTime: 300 }),
      fakeLog({ endpointAccess: '/api/games', responseTime: 100 }),
    ];

    const resultado = await new RequestTrackingService(fakeRepo(logs)).getResponseTimeStats();

    expect(resultado['/api/games']).toEqual({ avg: 150, min: 50, max: 300 });
  });

  test('getStatusCodeStats agrupa por codigo de estado', async () => {
    const logs = [
      fakeLog({ statusCode: 200 }),
      fakeLog({ statusCode: 200 }),
      fakeLog({ statusCode: 404 }),
      fakeLog({ statusCode: 500 }),
    ];

    const resultado = await new RequestTrackingService(fakeRepo(logs)).getStatusCodeStats();

    expect(resultado).toEqual({ 200: 2, 404: 1, 500: 1 });
  });

  test('getPopularEndpoints regresa el endpoint con mas solicitudes', async () => {
    const logs = [
      fakeLog({ endpointAccess: '/api/games' }),
      fakeLog({ endpointAccess: '/api/games' }),
      fakeLog({ endpointAccess: '/api/players' }),
    ];

    const resultado = await new RequestTrackingService(fakeRepo(logs)).getPopularEndpoints();

    expect(resultado).toEqual({ most_popular: '/api/games', request_count: 2 });
  });

  test('getPopularEndpoints regresa null si todavia no hay datos', async () => {
    const resultado = await new RequestTrackingService(fakeRepo([])).getPopularEndpoints();
    expect(resultado).toEqual({ most_popular: null, request_count: 0 });
  });
});
