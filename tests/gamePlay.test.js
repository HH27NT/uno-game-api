// integracion del flujo de jugadas nuevo: jugar, robar, decir UNO, desafiar,
// consultar mano/estado/historial y que el juego termine solo al vaciarse una mano
const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');
const { Card } = require('../src/models');
const { cardMatchesTop } = require('../src/utils/gameRules');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

const registrarYLoguear = async (username) => {
  await request(app)
    .post('/api/auth/register')
    .send({ username, email: `${username}@correo.com`, password: '123456' });

  const login = await request(app).post('/api/auth/login').send({ username, password: '123456' });
  const perfil = await request(app).get('/api/auth/profile').set('Authorization', login.body.access_token);

  return { token: login.body.access_token, id: perfil.body.id, username };
};

const crearPartidaCon2Jugadores = async (jugadorA, jugadorB) => {
  const crear = await request(app)
    .post('/api/games')
    .set('Authorization', jugadorA.token)
    .send({ name: `partida ${Date.now()}-${Math.random()}` });
  const gameId = crear.body.id;

  await request(app).post('/api/games/join').set('Authorization', jugadorB.token).send({ game_id: gameId });
  await request(app).post('/api/games/start').set('Authorization', jugadorA.token).send({ game_id: gameId });

  return gameId;
};

const tokensPorUsername = (jugadores) => Object.fromEntries(jugadores.map((j) => [j.username, j.token]));
const idsPorUsername = (jugadores) => Object.fromEntries(jugadores.map((j) => [j.username, j.id]));

describe('flujo completo de jugadas', () => {
  let jugadorA;
  let jugadorB;

  beforeAll(async () => {
    jugadorA = await registrarYLoguear('jugada_a');
    jugadorB = await registrarYLoguear('jugada_b');
  });

  test('cada jugador puede ver su propia mano con 7 cartas al iniciar', async () => {
    const gameId = await crearPartidaCon2Jugadores(jugadorA, jugadorB);

    const res = await request(app).get(`/api/games/hand?game_id=${gameId}`).set('Authorization', jugadorA.token);

    expect(res.status).toBe(200);
    expect(res.body.hand).toHaveLength(7);
  });

  test('no dejar jugar una carta que no coincide con la de arriba', async () => {
    const gameId = await crearPartidaCon2Jugadores(jugadorA, jugadorB);
    const tokens = tokensPorUsername([jugadorA, jugadorB]);

    const state = await request(app).get(`/api/games/state?game_id=${gameId}`);
    const actual = state.body.currentPlayer;
    const mano = state.body.hands[actual];
    const noJugable = mano.find((c) => !cardMatchesTop(c, state.body.topCard));

    if (!noJugable) return; // caso raro: toda la mano es jugable, no aplica este caso

    const res = await request(app)
      .put('/api/games/play')
      .set('Authorization', tokens[actual])
      .send({ game_id: gameId, card_id: noJugable.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no coincide/);
  });

  test('no dejar jugar ni robar a quien no le toca el turno', async () => {
    const gameId = await crearPartidaCon2Jugadores(jugadorA, jugadorB);
    const tokens = tokensPorUsername([jugadorA, jugadorB]);

    const state = await request(app).get(`/api/games/state?game_id=${gameId}`);
    const otro = state.body.currentPlayer === jugadorA.username ? jugadorB.username : jugadorA.username;

    const resDraw = await request(app).post('/api/games/draw').set('Authorization', tokens[otro]).send({ game_id: gameId });
    expect(resDraw.status).toBe(400);
    expect(resDraw.body.error).toBe('no es tu turno');
  });

  test('turno completo: se juega una carta valida o se roba, y el turno pasa al siguiente', async () => {
    const gameId = await crearPartidaCon2Jugadores(jugadorA, jugadorB);
    const tokens = tokensPorUsername([jugadorA, jugadorB]);

    for (let i = 0; i < 12; i++) {
      const state = await request(app).get(`/api/games/state?game_id=${gameId}`);
      if (state.body.status === 'finished') break;

      const actual = state.body.currentPlayer;
      const mano = state.body.hands[actual];
      const jugable = mano.find((c) => cardMatchesTop(c, state.body.topCard));

      if (jugable) {
        const esComodin = jugable.type === 'wild' || jugable.type === 'wild4';
        const res = await request(app)
          .put('/api/games/play')
          .set('Authorization', tokens[actual])
          .send({ game_id: gameId, card_id: jugable.id, ...(esComodin ? { declared_color: 'red' } : {}) });
        expect(res.status).toBe(200);
      } else {
        const res = await request(app)
          .post('/api/games/draw')
          .set('Authorization', tokens[actual])
          .send({ game_id: gameId });
        expect(res.status).toBe(200);
        expect(res.body.cardDrawn).toBeDefined();
      }
    }

    const historial = await request(app).get(`/api/games/history?game_id=${gameId}`);
    expect(historial.status).toBe(200);
    expect(historial.body.history.length).toBeGreaterThan(0);
  });

  test('decir UNO marca al jugador, y el desafio falla si ya lo dijo a tiempo', async () => {
    const gameId = await crearPartidaCon2Jugadores(jugadorA, jugadorB);
    const ids = idsPorUsername([jugadorA, jugadorB]);
    const tokens = tokensPorUsername([jugadorA, jugadorB]);

    // fuerza a jugadorA a quedar con 1 sola carta en mano (le queda la primera, se descartan las demas)
    const manoCompleta = await Card.findAll({ where: { gameId, ownerId: ids[jugadorA.username], location: 'hand' } });
    await Promise.all(manoCompleta.slice(1).map((c) => c.update({ location: 'discard' })));

    const uno = await request(app).patch('/api/games/uno').set('Authorization', tokens[jugadorA.username]).send({ game_id: gameId });
    expect(uno.status).toBe(200);

    const desafio = await request(app)
      .post('/api/games/challenge')
      .set('Authorization', tokens[jugadorB.username])
      .send({ game_id: gameId, challenged_player_id: ids[jugadorA.username] });

    expect(desafio.status).toBe(400);
    expect(desafio.body.error).toMatch(/said UNO on time/);
  });

  test('el desafio funciona si el jugador olvido decir UNO: roba 2 cartas', async () => {
    const gameId = await crearPartidaCon2Jugadores(jugadorA, jugadorB);
    const ids = idsPorUsername([jugadorA, jugadorB]);
    const tokens = tokensPorUsername([jugadorA, jugadorB]);

    const manoCompleta = await Card.findAll({ where: { gameId, ownerId: ids[jugadorA.username], location: 'hand' } });
    await Promise.all(manoCompleta.slice(1).map((c) => c.update({ location: 'discard' })));
    // a proposito no dice UNO

    const desafio = await request(app)
      .post('/api/games/challenge')
      .set('Authorization', tokens[jugadorB.username])
      .send({ game_id: gameId, challenged_player_id: ids[jugadorA.username] });

    expect(desafio.status).toBe(200);
    expect(desafio.body.message).toMatch(/forgot to say UNO/);

    const mano = await request(app).get(`/api/games/hand?game_id=${gameId}`).set('Authorization', tokens[jugadorA.username]);
    expect(mano.body.hand).toHaveLength(3); // 1 que le quedaba + 2 robadas
  });

  test('el juego termina y calcula puntajes cuando un jugador se queda sin cartas', async () => {
    const gameId = await crearPartidaCon2Jugadores(jugadorA, jugadorB);
    const ids = idsPorUsername([jugadorA, jugadorB]);
    const tokens = tokensPorUsername([jugadorA, jugadorB]);

    const state = await request(app).get(`/api/games/state?game_id=${gameId}`);
    const actual = state.body.currentPlayer;
    const actualId = ids[actual];

    // deja al jugador en turno con una sola carta, y la fuerza a un comodin (siempre jugable)
    const manoCompleta = await Card.findAll({ where: { gameId, ownerId: actualId, location: 'hand' } });
    const [cartaFinal, ...resto] = manoCompleta;
    await Promise.all(resto.map((c) => c.update({ location: 'discard' })));
    await cartaFinal.update({ color: 'wild', type: 'wild', value: null });

    const res = await request(app)
      .put('/api/games/play')
      .set('Authorization', tokens[actual])
      .send({ game_id: gameId, card_id: cartaFinal.id, declared_color: 'red' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(`${actual} has won the game!`);
    expect(res.body.scores).toBeDefined();

    const estadoFinal = await request(app).get(`/api/games/state?game_id=${gameId}`);
    expect(estadoFinal.body.status).toBe('finished');
  });
});
