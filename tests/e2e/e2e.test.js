// pruebas end-to-end: levantan el server http real (sin mocks de red) y pegan
// con fetch, simulando lo mismo que haria la UI. cubren los flujos principales:
// autenticacion, gestion de la sesion de juego, y las jugadas dentro de la partida.
const sequelize = require('../../src/config/database');
const app = require('../../src/app');
const createServer = require('../../src/createServer');
const { Card } = require('../../src/models');
const { cardMatchesTop } = require('../../src/utils/gameRules');

let httpServer;
let baseUrl;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  ({ httpServer } = createServer(app));
  await new Promise((resolve) => httpServer.listen(0, resolve));
  baseUrl = `http://localhost:${httpServer.address().port}/api`;
});

afterAll(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
  await sequelize.close();
});

const apiFetch = async (path, { method = 'GET', body, token } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['authorization'] = token;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, body: data };
};

const registrarYLoguear = async (username) => {
  await apiFetch('/auth/register', {
    method: 'POST',
    body: { username, email: `${username}@correo.com`, password: '123456' },
  });
  const login = await apiFetch('/auth/login', { method: 'POST', body: { username, password: '123456' } });
  const perfil = await apiFetch('/auth/profile', { token: login.body.access_token });

  return { token: login.body.access_token, id: perfil.body.id, username };
};

describe('E2E - autenticacion de usuario', () => {
  test('registrar un jugador nuevo', async () => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: { username: 'e2e_ana', email: 'ana@correo.com', password: '123456' },
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('jugador registrado correctamente');
  });

  test('no se puede registrar dos veces el mismo username', async () => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: { username: 'e2e_ana', email: 'otro@correo.com', password: '123456' },
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ese username ya esta registrado');
  });

  test('login con password incorrecto se rechaza', async () => {
    const res = await apiFetch('/auth/login', { method: 'POST', body: { username: 'e2e_ana', password: 'mala' } });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('usuario o password invalidos');
  });

  test('login correcto entrega un token, y con ese token se obtiene el perfil', async () => {
    const login = await apiFetch('/auth/login', { method: 'POST', body: { username: 'e2e_ana', password: '123456' } });
    expect(login.status).toBe(200);
    expect(login.body.access_token).toBeDefined();

    const perfil = await apiFetch('/auth/profile', { token: login.body.access_token });
    expect(perfil.status).toBe(200);
    expect(perfil.body.username).toBe('e2e_ana');
  });

  test('una ruta protegida sin token responde 401', async () => {
    const res = await apiFetch('/auth/profile');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('token invalido o no se mando token');
  });
});

describe('E2E - gestion de sesion de juego', () => {
  let jugadorA;
  let jugadorB;
  let gameId;

  beforeAll(async () => {
    jugadorA = await registrarYLoguear('e2e_creador');
    jugadorB = await registrarYLoguear('e2e_invitado');
  });

  test('el creador puede crear una partida', async () => {
    const res = await apiFetch('/games', { method: 'POST', body: { name: 'partida e2e' }, token: jugadorA.token });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.creatorId).toBe(jugadorA.id);
    gameId = res.body.id;
  });

  test('un segundo jugador se une a la partida', async () => {
    const res = await apiFetch('/games/join', { method: 'POST', body: { game_id: gameId }, token: jugadorB.token });
    expect(res.status).toBe(200);

    const players = await apiFetch(`/games/players?game_id=${gameId}`);
    expect(players.body.players).toHaveLength(2);
  });

  test('solo el creador puede iniciar la partida', async () => {
    const res = await apiFetch('/games/start', { method: 'POST', body: { game_id: gameId }, token: jugadorB.token });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('solo el creador puede iniciar el juego');
  });

  test('el creador inicia la partida y se reparten 7 cartas a cada jugador', async () => {
    const res = await apiFetch('/games/start', { method: 'POST', body: { game_id: gameId }, token: jugadorA.token });
    expect(res.status).toBe(200);

    const manoA = await apiFetch(`/games/hand?game_id=${gameId}`, { token: jugadorA.token });
    const manoB = await apiFetch(`/games/hand?game_id=${gameId}`, { token: jugadorB.token });
    expect(manoA.body.hand).toHaveLength(7);
    expect(manoB.body.hand).toHaveLength(7);
  });

  describe('jugadas dentro de la partida', () => {
    test('no se puede jugar una carta que no coincide con la de arriba', async () => {
      const state = await apiFetch(`/games/state?game_id=${gameId}`);
      const actual = state.body.currentPlayer;
      const token = actual === jugadorA.username ? jugadorA.token : jugadorB.token;
      const noJugable = state.body.hands[actual].find((c) => !cardMatchesTop(c, state.body.topCard));

      if (!noJugable) return; // caso raro: toda la mano calza, no aplica esta prueba

      const res = await apiFetch('/games/play', {
        method: 'PUT',
        body: { game_id: gameId, card_id: noJugable.id },
        token,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no coincide/);
    });

    test('jugar una carta valida (o robar si no hay ninguna) quita/agrega una carta de la mano', async () => {
      const state = await apiFetch(`/games/state?game_id=${gameId}`);
      const actual = state.body.currentPlayer;
      const token = actual === jugadorA.username ? jugadorA.token : jugadorB.token;
      const manoAntes = state.body.hands[actual];
      const jugable = manoAntes.find((c) => cardMatchesTop(c, state.body.topCard));

      if (jugable) {
        const esComodin = jugable.type === 'wild' || jugable.type === 'wild4';
        const res = await apiFetch('/games/play', {
          method: 'PUT',
          body: { game_id: gameId, card_id: jugable.id, ...(esComodin ? { declared_color: 'red' } : {}) },
          token,
        });
        expect(res.status).toBe(200);

        const manoDespues = await apiFetch(`/games/hand?game_id=${gameId}`, { token });
        expect(manoDespues.body.hand).toHaveLength(manoAntes.length - 1);
      } else {
        const res = await apiFetch('/games/draw', { method: 'POST', body: { game_id: gameId }, token });
        expect(res.status).toBe(200);
        expect(res.body.cardDrawn).toBeDefined();

        const manoDespues = await apiFetch(`/games/hand?game_id=${gameId}`, { token });
        expect(manoDespues.body.hand).toHaveLength(manoAntes.length + 1);
      }
    });

    test('decir UNO marca al jugador, y el desafio falla si ya lo dijo a tiempo', async () => {
      const manoCompleta = await Card.findAll({ where: { gameId, ownerId: jugadorA.id, location: 'hand' } });
      await Promise.all(manoCompleta.slice(1).map((c) => c.update({ location: 'discard' })));

      const uno = await apiFetch('/games/uno', { method: 'PATCH', body: { game_id: gameId }, token: jugadorA.token });
      expect(uno.status).toBe(200);

      const desafio = await apiFetch('/games/challenge', {
        method: 'POST',
        body: { game_id: gameId, challenged_player_id: jugadorA.id },
        token: jugadorB.token,
      });

      expect(desafio.status).toBe(400);
      expect(desafio.body.error).toMatch(/said UNO on time/);
    });

    test('el desafio funciona si el jugador olvido decir UNO: roba 2 cartas', async () => {
      const manoCompleta = await Card.findAll({ where: { gameId, ownerId: jugadorB.id, location: 'hand' } });
      await Promise.all(manoCompleta.slice(1).map((c) => c.update({ location: 'discard' })));
      // jugadorB a proposito no dice UNO antes de este desafio

      const desafio = await apiFetch('/games/challenge', {
        method: 'POST',
        body: { game_id: gameId, challenged_player_id: jugadorB.id },
        token: jugadorA.token,
      });

      expect(desafio.status).toBe(200);
      expect(desafio.body.message).toMatch(/forgot to say UNO/);

      const mano = await apiFetch(`/games/hand?game_id=${gameId}`, { token: jugadorB.token });
      expect(mano.body.hand).toHaveLength(3); // 1 que le quedaba + 2 robadas
    });

    test('la partida termina y guarda los puntajes cuando un jugador se queda sin cartas', async () => {
      const state = await apiFetch(`/games/state?game_id=${gameId}`);
      const actual = state.body.currentPlayer;
      const ganador = actual === jugadorA.username ? jugadorA : jugadorB;

      const manoCompleta = await Card.findAll({ where: { gameId, ownerId: ganador.id, location: 'hand' } });
      const [cartaFinal, ...resto] = manoCompleta;
      await Promise.all(resto.map((c) => c.update({ location: 'discard' })));
      await cartaFinal.update({ color: 'wild', type: 'wild', value: null });

      const res = await apiFetch('/games/play', {
        method: 'PUT',
        body: { game_id: gameId, card_id: cartaFinal.id, declared_color: 'red' },
        token: ganador.token,
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe(`${ganador.username} has won the game!`);
      expect(res.body.scores).toBeDefined();

      const estadoFinal = await apiFetch(`/games/state?game_id=${gameId}`);
      expect(estadoFinal.body.status).toBe('finished');

      const puntajes = await apiFetch(`/scores/player/${ganador.id}`);
      expect(puntajes.status).toBe(200);
      expect(puntajes.body.some((s) => s.gameId === gameId && s.result === 'win')).toBe(true);
    });
  });
});

describe('E2E - cierre de sesion', () => {
  test('cerrar sesion invalida el token para futuras acciones', async () => {
    const jugador = await registrarYLoguear('e2e_logout');

    const logout = await apiFetch('/auth/logout', { method: 'POST', token: jugador.token });
    expect(logout.status).toBe(200);
    expect(logout.body.message).toBe('sesion cerrada');

    const perfil = await apiFetch('/auth/profile', { token: jugador.token });
    expect(perfil.status).toBe(401);
    expect(perfil.body.error).toBe('token invalido o no se mando token');
  });
});
