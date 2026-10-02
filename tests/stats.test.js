// middleware de tracking + los 4 endpoints de /api/stats, contra la app real
const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

// el tracking se guarda async sin await, le damos un respiro antes de leer las stats
const esperarTracking = () => new Promise((resolve) => setTimeout(resolve, 100));

describe('middleware de tracking + endpoints de /api/stats', () => {
  test('las requests a la api quedan reflejadas en /api/stats/requests', async () => {
    await request(app).get('/api/games');
    await request(app).get('/api/games');
    await request(app).get('/api/games/999999');
    await esperarTracking();

    const res = await request(app).get('/api/stats/requests');

    expect(res.status).toBe(200);
    expect(res.body.total_requests).toBeGreaterThanOrEqual(3);
    expect(res.body.breakdown['/api/games'].GET).toBeGreaterThanOrEqual(2);
    expect(res.body.breakdown['/api/games/:id'].GET).toBeGreaterThanOrEqual(1);
  });

  test('/api/stats/response-times trae avg/min/max por endpoint', async () => {
    await request(app).get('/api/players');
    await esperarTracking();

    const res = await request(app).get('/api/stats/response-times');

    expect(res.status).toBe(200);
    const stats = res.body['/api/players'];
    expect(stats).toBeDefined();
    expect(stats.avg).toBeGreaterThanOrEqual(0);
    expect(stats.min).toBeLessThanOrEqual(stats.avg);
    expect(stats.max).toBeGreaterThanOrEqual(stats.avg);
  });

  test('/api/stats/status-codes cuenta las respuestas por codigo', async () => {
    await request(app).get('/api/games/999999');
    await esperarTracking();

    const res = await request(app).get('/api/stats/status-codes');

    expect(res.status).toBe(200);
    expect(res.body['404']).toBeGreaterThanOrEqual(1);
  });

  test('/api/stats/popular-endpoints devuelve el endpoint mas pedido', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).get('/api/games');
    }
    await esperarTracking();

    const res = await request(app).get('/api/stats/popular-endpoints');

    expect(res.status).toBe(200);
    expect(res.body.most_popular).toBe('/api/games');
    expect(res.body.request_count).toBeGreaterThanOrEqual(5);
  });

  test('las requests autenticadas guardan el userId en el tracking', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'stats_user', email: 'stats_user@correo.com', password: '123456' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'stats_user', password: '123456' });

    await request(app).get('/api/auth/profile').set('Authorization', login.body.access_token);
    await esperarTracking();

    const { RequestLog } = require('../src/models');
    const registro = await RequestLog.findOne({ where: { endpointAccess: '/api/auth/profile' } });

    expect(registro).not.toBeNull();
    expect(registro.userId).not.toBeNull();
  });
});
