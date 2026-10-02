// rutas nuevas del motor de turnos, sin auth ni db (son calculos puros)
const request = require('supertest');
const app = require('../src/app');

describe('POST /api/turns/next-turn', () => {
  test('devuelve el siguiente jugador en orden horario', async () => {
    const res = await request(app)
      .post('/api/turns/next-turn')
      .send({ players: ['Alice', 'Bob', 'Charlie', 'Diana'], currentPlayerIndex: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ nextPlayerIndex: 2, nextPlayer: 'Charlie' });
  });

  test('400 si falta el body', async () => {
    const res = await request(app).post('/api/turns/next-turn').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/turns/play-card', () => {
  test('carta de salto', async () => {
    const res = await request(app).post('/api/turns/play-card').send({
      cardPlayed: 'skip',
      currentPlayerIndex: 2,
      players: ['Alice', 'Bob', 'Charlie', 'Diana'],
      direction: 'clockwise',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ nextPlayerIndex: 0, nextPlayer: 'Alice', skippedPlayer: 'Diana' });
  });

  test('carta de reversa', async () => {
    const res = await request(app).post('/api/turns/play-card').send({
      cardPlayed: 'reverse',
      currentPlayerIndex: 2,
      players: ['Alice', 'Bob', 'Charlie', 'Diana'],
      direction: 'clockwise',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ newDirection: 'counterclockwise', nextPlayerIndex: 1, nextPlayer: 'Bob' });
  });

  test('400 si falta direction', async () => {
    const res = await request(app)
      .post('/api/turns/play-card')
      .send({ cardPlayed: 'skip', currentPlayerIndex: 0, players: ['Alice', 'Bob'] });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/turns/draw-card', () => {
  test('roba cartas hasta encontrar una jugable', async () => {
    const res = await request(app)
      .post('/api/turns/draw-card')
      .send({ playerHand: ['red_2', 'blue_5'], deck: ['green_4', 'yellow_2', 'red_9'], currentCard: 'red_7' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      newHand: ['red_2', 'blue_5', 'green_4', 'yellow_2', 'red_9'],
      drawnCard: 'red_9',
      playable: true,
    });
  });

  test('400 si el mazo no es un array', async () => {
    const res = await request(app)
      .post('/api/turns/draw-card')
      .send({ playerHand: [], deck: 'no es array', currentCard: 'red_7' });

    expect(res.status).toBe(400);
  });
});
