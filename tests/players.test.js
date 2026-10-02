// CRUD de jugadores, contra sqlite en memoria
const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

let playerId;

describe('CRUD /api/players', () => {
  test('crea un jugador', async () => {
    const res = await request(app)
      .post('/api/players')
      .send({ username: 'ana123', email: 'ana123@correo.com' });

    expect(res.status).toBe(201);
    expect(res.body.username).toBe('ana123');
    playerId = res.body.id;
  });

  test('no crea un jugador con username repetido', async () => {
    const res = await request(app)
      .post('/api/players')
      .send({ username: 'ana123', email: 'otro@correo.com' });

    expect(res.status).toBe(400);
  });

  test('trae todos los jugadores', async () => {
    const res = await request(app).get('/api/players');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('trae un jugador por id', async () => {
    const res = await request(app).get(`/api/players/${playerId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(playerId);
  });

  test('404 si el jugador no existe', async () => {
    const res = await request(app).get('/api/players/999999');
    expect(res.status).toBe(404);
  });

  test('actualiza un jugador', async () => {
    const res = await request(app).put(`/api/players/${playerId}`).send({ username: 'ana_nueva' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('ana_nueva');
  });

  test('404 al actualizar un jugador que no existe', async () => {
    const res = await request(app).put('/api/players/999999').send({ username: 'x' });
    expect(res.status).toBe(404);
  });

  test('borra un jugador', async () => {
    const res = await request(app).delete(`/api/players/${playerId}`);
    expect(res.status).toBe(204);
  });

  test('404 al borrar un jugador que ya no existe', async () => {
    const res = await request(app).delete(`/api/players/${playerId}`);
    expect(res.status).toBe(404);
  });
});
