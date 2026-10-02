// CRUD de juegos + flujo completo de partida
const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');

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
  return login.body.access_token;
};

let tokenCreador;
let tokenInvitado;
let gameId;

beforeAll(async () => {
  tokenCreador = await registrarYLoguear('creador');
  tokenInvitado = await registrarYLoguear('invitado');
});

describe('CRUD /api/games', () => {
  test('no deja crear un juego sin estar logueado', async () => {
    const res = await request(app).post('/api/games').send({ name: 'sin token' });
    expect(res.status).toBe(401);
  });

  test('crea un juego (el creador ya queda adentro con sus 108 cartas)', async () => {
    const res = await request(app)
      .post('/api/games')
      .set('Authorization', tokenCreador)
      .send({ name: 'partida de prueba' });

    expect(res.status).toBe(201);
    gameId = res.body.id;
  });

  test('trae todos los juegos', async () => {
    const res = await request(app).get('/api/games');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('trae un juego por id (con sus cartas)', async () => {
    const res = await request(app).get(`/api/games/${gameId}`);
    expect(res.status).toBe(200);
    expect(res.body.cards).toHaveLength(108);
  });

  test('404 si el juego no existe', async () => {
    const res = await request(app).get('/api/games/999999');
    expect(res.status).toBe(404);
  });

  test('actualiza un juego', async () => {
    const res = await request(app).put(`/api/games/${gameId}`).send({ maxPlayers: 3 });
    expect(res.status).toBe(200);
    expect(res.body.maxPlayers).toBe(3);
  });

  test('borra un juego', async () => {
    const creado = await request(app)
      .post('/api/games')
      .set('Authorization', tokenCreador)
      .send({ name: 'juego para borrar' });

    const res = await request(app).delete(`/api/games/${creado.body.id}`);
    expect(res.status).toBe(204);
  });

  test('404 al borrar un juego que ya no existe', async () => {
    const res = await request(app).delete('/api/games/999999');
    expect(res.status).toBe(404);
  });
});

describe('flujo de la partida', () => {
  test('no hay carta en el descarte antes de iniciar', async () => {
    const res = await request(app).get(`/api/games/top-card?game_id=${gameId}`);
    expect(res.status).toBe(404);
  });

  test('no deja unirse sin estar logueado', async () => {
    const res = await request(app).post('/api/games/join').send({ game_id: gameId });
    expect(res.status).toBe(401);
  });

  test('un jugador nuevo se une al juego', async () => {
    const res = await request(app)
      .post('/api/games/join')
      .set('Authorization', tokenInvitado)
      .send({ game_id: gameId });

    expect(res.status).toBe(200);
  });

  test('no deja unirse dos veces al mismo jugador', async () => {
    const res = await request(app)
      .post('/api/games/join')
      .set('Authorization', tokenInvitado)
      .send({ game_id: gameId });

    expect(res.status).toBe(400);
  });

  test('no deja iniciar el juego a alguien que no es el creador', async () => {
    const res = await request(app)
      .post('/api/games/start')
      .set('Authorization', tokenInvitado)
      .send({ game_id: gameId });

    expect(res.status).toBe(400);
  });

  test('el creador inicia el juego', async () => {
    const res = await request(app)
      .post('/api/games/start')
      .set('Authorization', tokenCreador)
      .send({ game_id: gameId });

    expect(res.status).toBe(200);
  });

  test('no deja unirse a un juego que ya empezo', async () => {
    const res = await request(app)
      .post('/api/games/join')
      .set('Authorization', tokenInvitado)
      .send({ game_id: gameId });

    expect(res.status).toBe(400);
  });

  test('no deja iniciar el juego dos veces', async () => {
    const res = await request(app)
      .post('/api/games/start')
      .set('Authorization', tokenCreador)
      .send({ game_id: gameId });

    expect(res.status).toBe(400);
  });

  test('el estado del juego ya es in_progress', async () => {
    const res = await request(app).get(`/api/games/state?game_id=${gameId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  test('falta game_id en el query da 400', async () => {
    const res = await request(app).get('/api/games/state');
    expect(res.status).toBe(400);
  });

  test('la lista de jugadores tiene al creador y al invitado', async () => {
    const res = await request(app).get(`/api/games/players?game_id=${gameId}`);
    expect(res.status).toBe(200);
    expect(res.body.players).toHaveLength(2);
  });

  test('el jugador actual es el primero de la lista', async () => {
    const res = await request(app).get(`/api/games/current-player?game_id=${gameId}`);
    expect(res.status).toBe(200);
    expect(res.body.current_player.username).toBe('creador');
  });

  test('ya hay una carta en el descarte', async () => {
    const res = await request(app).get(`/api/games/top-card?game_id=${gameId}`);
    expect(res.status).toBe(200);
    expect(res.body.top_card).toBeDefined();
  });

  test('las puntuaciones muestran 7 cartas en mano para cada jugador', async () => {
    const res = await request(app).get(`/api/games/scores?game_id=${gameId}`);
    expect(res.status).toBe(200);
    expect(res.body.scores).toHaveLength(2);
    res.body.scores.forEach((puntuacion) => expect(puntuacion.cardsInHand).toBe(7));
  });

  test('el invitado abandona el juego', async () => {
    const res = await request(app)
      .post('/api/games/leave')
      .set('Authorization', tokenInvitado)
      .send({ game_id: gameId });

    expect(res.status).toBe(200);
  });

  test('no deja abandonar dos veces', async () => {
    const res = await request(app)
      .post('/api/games/leave')
      .set('Authorization', tokenInvitado)
      .send({ game_id: gameId });

    expect(res.status).toBe(400);
  });

  test('no deja finalizar el juego a quien no es el creador', async () => {
    const res = await request(app)
      .post('/api/games/end')
      .set('Authorization', tokenInvitado)
      .send({ game_id: gameId });

    expect(res.status).toBe(400);
  });

  test('el creador finaliza el juego', async () => {
    const res = await request(app)
      .post('/api/games/end')
      .set('Authorization', tokenCreador)
      .send({ game_id: gameId });

    expect(res.status).toBe(200);
  });

  test('no deja finalizar el juego dos veces', async () => {
    const res = await request(app)
      .post('/api/games/end')
      .set('Authorization', tokenCreador)
      .send({ game_id: gameId });

    expect(res.status).toBe(400);
  });
});

describe('casos limite del flujo', () => {
  test('no se puede iniciar un juego con un solo jugador', async () => {
    const soloRes = await request(app)
      .post('/api/games')
      .set('Authorization', tokenCreador)
      .send({ name: 'juego solitario' });

    const inicioRes = await request(app)
      .post('/api/games/start')
      .set('Authorization', tokenCreador)
      .send({ game_id: soloRes.body.id });

    expect(inicioRes.status).toBe(400);
  });

  test('no se puede unir a un juego lleno', async () => {
    const llenoRes = await request(app)
      .post('/api/games')
      .set('Authorization', tokenCreador)
      .send({ name: 'juego chiquito', maxPlayers: 1 });

    const joinRes = await request(app)
      .post('/api/games/join')
      .set('Authorization', tokenInvitado)
      .send({ game_id: llenoRes.body.id });

    expect(joinRes.status).toBe(400);
  });

  test('join a un juego que no existe da error', async () => {
    const res = await request(app)
      .post('/api/games/join')
      .set('Authorization', tokenInvitado)
      .send({ game_id: 999999 });

    expect(res.status).toBe(400);
  });

  test('game_id vacio en el body da 400', async () => {
    const res = await request(app).post('/api/games/join').set('Authorization', tokenInvitado).send({});
    expect(res.status).toBe(400);
  });

  test('start a un juego que no existe da error', async () => {
    const res = await request(app)
      .post('/api/games/start')
      .set('Authorization', tokenCreador)
      .send({ game_id: 999999 });

    expect(res.status).toBe(400);
  });

  test('leave a un juego que no existe da error', async () => {
    const res = await request(app)
      .post('/api/games/leave')
      .set('Authorization', tokenCreador)
      .send({ game_id: 999999 });

    expect(res.status).toBe(400);
  });

  test('end a un juego que no existe da error', async () => {
    const res = await request(app)
      .post('/api/games/end')
      .set('Authorization', tokenCreador)
      .send({ game_id: 999999 });

    expect(res.status).toBe(400);
  });

  test('state de un juego que no existe da 404', async () => {
    const res = await request(app).get('/api/games/state?game_id=999999');
    expect(res.status).toBe(404);
  });

  test('players de un juego que no existe da 404', async () => {
    const res = await request(app).get('/api/games/players?game_id=999999');
    expect(res.status).toBe(404);
  });

  test('current-player de un juego que no existe da 404', async () => {
    const res = await request(app).get('/api/games/current-player?game_id=999999');
    expect(res.status).toBe(404);
  });

  test('top-card de un juego que no existe da 404', async () => {
    const res = await request(app).get('/api/games/top-card?game_id=999999');
    expect(res.status).toBe(404);
  });

  test('scores de un juego que no existe da 404', async () => {
    const res = await request(app).get('/api/games/scores?game_id=999999');
    expect(res.status).toBe(404);
  });
});
