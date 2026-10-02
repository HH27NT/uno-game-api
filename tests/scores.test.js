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
let gameId;
let scoreId;

beforeAll(async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'jugadorScore', email: 'score@correo.com', password: '123456' });

  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'jugadorScore', password: '123456' });

  const token = login.body.access_token;

  const perfil = await request(app).get('/api/auth/profile').set('Authorization', token);
  playerId = perfil.body.id;

  const juego = await request(app)
    .post('/api/games')
    .set('Authorization', token)
    .send({ name: 'partida para scores' });
  gameId = juego.body.id;
});

describe('CRUD /api/scores', () => {
  test('crea un score y suma la victoria al jugador', async () => {
    const res = await request(app)
      .post('/api/scores')
      .send({ playerId, gameId, points: 45, result: 'win' });

    expect(res.status).toBe(201);
    scoreId = res.body.id;

    const jugador = await request(app).get(`/api/players/${playerId}`);
    expect(jugador.body.wins).toBe(1);
  });

  test('crea un score con result lose y no suma victoria', async () => {
    const res = await request(app).post('/api/scores').send({ playerId, gameId, points: 5, result: 'lose' });
    expect(res.status).toBe(201);

    const jugador = await request(app).get(`/api/players/${playerId}`);
    expect(jugador.body.wins).toBe(1); // sigue en 1, este score no fue victoria
  });

  test('trae los scores de un jugador', async () => {
    const res = await request(app).get(`/api/scores/player/${playerId}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('trae un score por id', async () => {
    const res = await request(app).get(`/api/scores/${scoreId}`);
    expect(res.status).toBe(200);
    expect(res.body.points).toBe(45);
  });

  test('404 si el score no existe', async () => {
    const res = await request(app).get('/api/scores/999999');
    expect(res.status).toBe(404);
  });

  test('actualiza un score', async () => {
    const res = await request(app).put(`/api/scores/${scoreId}`).send({ points: 60 });
    expect(res.status).toBe(200);
    expect(res.body.points).toBe(60);
  });

  test('404 al actualizar un score que no existe', async () => {
    const res = await request(app).put('/api/scores/999999').send({ points: 1 });
    expect(res.status).toBe(404);
  });

  test('borra un score', async () => {
    const res = await request(app).delete(`/api/scores/${scoreId}`);
    expect(res.status).toBe(204);
  });

  test('404 al borrar un score que ya no existe', async () => {
    const res = await request(app).delete(`/api/scores/${scoreId}`);
    expect(res.status).toBe(404);
  });
});
