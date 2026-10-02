// CRUD de cartas, contra sqlite en memoria
const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

let gameId;
let cardId;

beforeAll(async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'jugadorCartas', email: 'cartas@correo.com', password: '123456' });

  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'jugadorCartas', password: '123456' });

  const juego = await request(app)
    .post('/api/games')
    .set('Authorization', login.body.access_token)
    .send({ name: 'partida para cartas' });

  gameId = juego.body.id;
});

describe('CRUD /api/cards', () => {
  test('crear un juego ya deja las 108 cartas listas', async () => {
    const res = await request(app).get(`/api/cards/game/${gameId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(108);
    cardId = res.body[0].id;
  });

  test('trae una carta por id', async () => {
    const res = await request(app).get(`/api/cards/${cardId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(cardId);
  });

  test('404 si la carta no existe', async () => {
    const res = await request(app).get('/api/cards/999999');
    expect(res.status).toBe(404);
  });

  test('actualiza una carta (ej. asignarla a un jugador)', async () => {
    const res = await request(app).put(`/api/cards/${cardId}`).send({ location: 'hand' });
    expect(res.status).toBe(200);
    expect(res.body.location).toBe('hand');
  });

  test('404 al actualizar una carta que no existe', async () => {
    const res = await request(app).put('/api/cards/999999').send({ location: 'hand' });
    expect(res.status).toBe(404);
  });

  test('borra una carta', async () => {
    const res = await request(app).delete(`/api/cards/${cardId}`);
    expect(res.status).toBe(204);
  });

  test('404 al borrar una carta que ya no existe', async () => {
    const res = await request(app).delete(`/api/cards/${cardId}`);
    expect(res.status).toBe(404);
  });
});
