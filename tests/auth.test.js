// tests de registro, login, logout y perfil, contra una base sqlite en memoria
const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/auth/register', () => {
  test('registra un jugador nuevo', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'hector', email: 'hector@correo.com', password: '123456' });

    expect(res.status).toBe(201);
  });

  test('no deja registrar el mismo username dos veces', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'hector', email: 'otro@correo.com', password: '123456' });

    expect(res.status).toBe(409);
  });

  test('no deja registrar con un email ya usado por otro username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'hector2', email: 'hector@correo.com', password: '123456' });

    expect(res.status).toBe(400);
  });

  test('no deja registrar si faltan datos', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'incompleto' });
    expect(res.status).toBe(400);
  });

  test('no deja registrar con password muy corto', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'cortito', email: 'cortito@correo.com', password: '123' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  test('regresa un access_token con las credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'hector', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
  });

  test('rechaza password incorrecto', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'hector', password: 'malPassword' });

    expect(res.status).toBe(401);
  });

  test('rechaza si faltan credenciales', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'hector' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/profile y POST /api/auth/logout', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'hector', password: '123456' });
    token = res.body.access_token;
  });

  test('trae el perfil si el token es valido', async () => {
    const res = await request(app).get('/api/auth/profile').set('Authorization', token);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('hector');
    expect(res.body.password).toBeUndefined();
  });

  test('rechaza el perfil sin token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  test('cierra sesion y despues el token ya no sirve', async () => {
    const logoutRes = await request(app).post('/api/auth/logout').set('Authorization', token);
    expect(logoutRes.status).toBe(200);

    const perfilRes = await request(app).get('/api/auth/profile').set('Authorization', token);
    expect(perfilRes.status).toBe(401);
  });
});
