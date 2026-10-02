// rutas generales: raiz y 404
const request = require('supertest');
const app = require('../src/app');

describe('rutas generales de la app', () => {
  test('GET / regresa un mensaje de que el server esta vivo', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  test('una ruta que no existe da 404 con mensaje claro', async () => {
    const res = await request(app).get('/api/esto-no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ruta no encontrada');
  });
});
