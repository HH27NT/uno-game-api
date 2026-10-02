const API_BASE = '/api';

const state = {
  token: null,
  player: null,
  currentGame: null,
  players: [],
  hand: [],
  pendingWildCardId: null,
  socket: null,
};

// --- helpers ---

const el = (id) => document.getElementById(id);

const showSection = (name) => {
  el('auth-section').classList.toggle('hidden', name !== 'auth');
  el('lobby-section').classList.toggle('hidden', name !== 'lobby');
  el('game-section').classList.toggle('hidden', name !== 'game');
  el('user-info').classList.toggle('hidden', name === 'auth');
};

const showMessage = (elementId, text) => {
  el(elementId).textContent = text || '';
};

const apiFetch = async (path, { method = 'GET', body, auth = true } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) headers['authorization'] = state.token;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'ocurrio un error');
  return data;
};

// mismo criterio que src/utils/gameRules.js, solo para pintar el hint en la mano
const cardMatchesTop = (card, topCard) => {
  if (!topCard) return true;
  if (card.color === 'wild') return true;
  if (card.color === topCard.color) return true;
  if (card.type === topCard.type && card.type !== 'number') return true;
  return card.type === 'number' && topCard.type === 'number' && card.value === topCard.value;
};

const cardLabel = (card) => {
  if (card.type === 'wild') return 'W';
  if (card.type === 'wild4') return '+4';
  if (card.type === 'draw2') return '+2';
  if (card.type === 'skip') return 'X';
  if (card.type === 'reverse') return 'R';
  return String(card.value);
};

// --- sesion ---

const saveSession = () => {
  localStorage.setItem('uno_session', JSON.stringify({ token: state.token, player: state.player }));
};

const loadSession = () => {
  try {
    const raw = localStorage.getItem('uno_session');
    if (!raw) return false;
    const { token, player } = JSON.parse(raw);
    if (!token || !player) return false;
    state.token = token;
    state.player = player;
    return true;
  } catch {
    return false;
  }
};

const clearSession = () => {
  localStorage.removeItem('uno_session');
  state.token = null;
  state.player = null;
};

const enterApp = () => {
  el('username-label').textContent = state.player.username;
  showSection('lobby');
  refreshGames();
};

// --- auth ---

el('tab-login').addEventListener('click', () => {
  el('tab-login').classList.add('active');
  el('tab-register').classList.remove('active');
  el('login-form').classList.remove('hidden');
  el('register-form').classList.add('hidden');
});

el('tab-register').addEventListener('click', () => {
  el('tab-register').classList.add('active');
  el('tab-login').classList.remove('active');
  el('register-form').classList.remove('hidden');
  el('login-form').classList.add('hidden');
});

el('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('auth-message', '');
  try {
    const username = el('login-username').value.trim();
    const password = el('login-password').value;
    const { access_token } = await apiFetch('/auth/login', {
      method: 'POST',
      auth: false,
      body: { username, password },
    });
    state.token = access_token;
    const profile = await apiFetch('/auth/profile');
    state.player = profile;
    saveSession();
    enterApp();
  } catch (err) {
    showMessage('auth-message', err.message);
  }
});

el('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('auth-message', '');
  try {
    const username = el('register-username').value.trim();
    const email = el('register-email').value.trim();
    const password = el('register-password').value;
    await apiFetch('/auth/register', { method: 'POST', auth: false, body: { username, email, password } });
    showMessage('auth-message', 'listo, ahora inicia sesion');
    el('tab-login').click();
  } catch (err) {
    showMessage('auth-message', err.message);
  }
});

el('logout-btn').addEventListener('click', async () => {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // si el token ya estaba vencido no importa, igual limpiamos la sesion local
  }
  if (state.socket) state.socket.disconnect();
  clearSession();
  showSection('auth');
});

// --- lobby ---

const refreshGames = async () => {
  showMessage('lobby-message', '');
  try {
    const games = await apiFetch('/games');
    const conJugadores = await Promise.all(
      games.map(async (g) => {
        try {
          const { players } = await apiFetch(`/games/players?game_id=${g.id}`, { auth: false });
          return { ...g, playerCount: players.length };
        } catch {
          return { ...g, playerCount: '?' };
        }
      })
    );
    renderGamesTable(conJugadores);
  } catch (err) {
    showMessage('lobby-message', err.message);
  }
};

const renderGamesTable = (games) => {
  el('games-tbody').innerHTML = games
    .map(
      (g) => `
      <tr>
        <td>${g.id}</td>
        <td>${g.name || '(sin nombre)'}</td>
        <td>${g.status}</td>
        <td>${g.playerCount}/${g.maxPlayers}</td>
        <td><button data-game-id="${g.id}" class="enter-game-btn">entrar</button></td>
      </tr>`
    )
    .join('');

  document.querySelectorAll('.enter-game-btn').forEach((btn) => {
    btn.addEventListener('click', () => enterGame(Number(btn.dataset.gameId)));
  });
};

el('refresh-games-btn').addEventListener('click', refreshGames);

el('create-game-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('lobby-message', '');
  try {
    const name = el('game-name').value.trim();
    const maxPlayers = Number(el('game-max-players').value) || 4;
    const game = await apiFetch('/games', { method: 'POST', body: { name, maxPlayers } });
    el('game-name').value = '';
    await enterGame(game.id);
  } catch (err) {
    showMessage('lobby-message', err.message);
  }
});

el('back-to-lobby-btn').addEventListener('click', () => {
  if (state.socket) state.socket.disconnect();
  state.currentGame = null;
  showSection('lobby');
  refreshGames();
});

// --- juego ---

const enterGame = async (gameId) => {
  showMessage('lobby-message', '');
  try {
    const players = await apiFetch(`/games/players?game_id=${gameId}`, { auth: false });
    const yaEstoy = players.players.some((p) => p.id === state.player.id);
    if (!yaEstoy) {
      await apiFetch('/games/join', { method: 'POST', body: { game_id: gameId } });
    }
  } catch (err) {
    // si el juego ya empezo o esta lleno, igual dejamos ver el estado si ya somos parte
    showMessage('lobby-message', err.message);
    return;
  }

  state.currentGame = gameId;
  showSection('game');
  connectSocket();
  await refreshGame();
};

const connectSocket = () => {
  if (state.socket) state.socket.disconnect();
  state.socket = io();
  state.socket.emit('join', { gameId: state.currentGame, playerName: state.player.username });

  ['player-joined', 'card-played', 'card-drawn', 'uno-called', 'uno-challenged', 'game-over'].forEach((tipo) => {
    state.socket.on(tipo, () => refreshGame());
  });
};

const refreshGame = async () => {
  const gameId = state.currentGame;
  try {
    const [details, playersRes, gameState] = await Promise.all([
      apiFetch(`/games/${gameId}`, { auth: false }),
      apiFetch(`/games/players?game_id=${gameId}`, { auth: false }),
      apiFetch(`/games/state?game_id=${gameId}`, { auth: false }),
    ]);
    state.players = playersRes.players;

    let hand = [];
    if (gameState.status === 'in_progress') {
      const handRes = await apiFetch(`/games/hand?game_id=${gameId}`);
      hand = handRes.hand;
    }
    state.hand = hand;

    renderGame(details, playersRes.players, gameState, hand);
  } catch (err) {
    showMessage('game-message', err.message);
  }
};

const renderGame = (details, players, gameState, hand) => {
  el('game-title').textContent = `Partida #${details.id} - ${details.name || 'sin nombre'}`;
  el('game-status').textContent = `estado: ${gameState.status}`;

  el('players-list').innerHTML = players
    .map((p) => {
      const cardCount = gameState.hands?.[p.username]?.length;
      const esActual = p.username === gameState.currentPlayer;
      const cuenta = cardCount != null ? ` (${cardCount} cartas)` : '';
      return `<li class="${esActual ? 'current-turn' : ''}">${p.username}${cuenta}</li>`;
    })
    .join('');

  const soyCreador = details.creatorId === state.player.id;
  el('start-btn').classList.toggle('hidden', !(gameState.status === 'waiting' && soyCreador));
  el('end-btn').classList.toggle('hidden', !(gameState.status !== 'finished' && soyCreador));

  const topCard = gameState.topCard;
  el('top-card').className = `card ${topCard ? topCard.color : ''}`;
  el('top-card').textContent = topCard ? cardLabel(topCard) : '-';

  el('history-list').innerHTML = (gameState.turnHistory || [])
    .map((h) => `<li>${h.player}: ${h.action}</li>`)
    .join('');

  const esMiTurno = gameState.currentPlayer === state.player.username;
  el('draw-btn').disabled = !(gameState.status === 'in_progress' && esMiTurno);
  el('uno-btn').disabled = gameState.status !== 'in_progress';

  el('challenge-select').innerHTML = players
    .filter((p) => p.id !== state.player.id)
    .map((p) => `<option value="${p.id}">${p.username}</option>`)
    .join('');
  el('challenge-btn').disabled = gameState.status !== 'in_progress';

  el('hand-cards').innerHTML = hand
    .map((c) => {
      const jugable = esMiTurno && cardMatchesTop(c, topCard);
      return `<div class="card ${c.color} ${jugable ? 'playable' : ''}" data-card-id="${c.id}">${cardLabel(c)}</div>`;
    })
    .join('');

  document.querySelectorAll('#hand-cards .card').forEach((cardEl) => {
    cardEl.addEventListener('click', () => onHandCardClick(Number(cardEl.dataset.cardId)));
  });
};

const onHandCardClick = (cardId) => {
  const carta = state.hand.find((c) => c.id === cardId);
  if (!carta) return;

  if (carta.type === 'wild' || carta.type === 'wild4') {
    state.pendingWildCardId = cardId;
    el('color-picker').classList.remove('hidden');
    return;
  }

  playCard(cardId);
};

document.querySelectorAll('.color-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    el('color-picker').classList.add('hidden');
    if (state.pendingWildCardId) {
      playCard(state.pendingWildCardId, btn.dataset.color);
      state.pendingWildCardId = null;
    }
  });
});

const playCard = async (cardId, declaredColor) => {
  showMessage('game-message', '');
  try {
    const resultado = await apiFetch('/games/play', {
      method: 'PUT',
      body: { game_id: state.currentGame, card_id: cardId, declared_color: declaredColor },
    });
    showMessage('game-message', resultado.message || '');
    await refreshGame();
  } catch (err) {
    showMessage('game-message', err.message);
  }
};

el('draw-btn').addEventListener('click', async () => {
  showMessage('game-message', '');
  try {
    const resultado = await apiFetch('/games/draw', { method: 'POST', body: { game_id: state.currentGame } });
    showMessage('game-message', resultado.message || '');
    await refreshGame();
  } catch (err) {
    showMessage('game-message', err.message);
  }
});

el('uno-btn').addEventListener('click', async () => {
  showMessage('game-message', '');
  try {
    const resultado = await apiFetch('/games/uno', { method: 'PATCH', body: { game_id: state.currentGame } });
    showMessage('game-message', resultado.message || '');
  } catch (err) {
    showMessage('game-message', err.message);
  }
});

el('challenge-btn').addEventListener('click', async () => {
  showMessage('game-message', '');
  try {
    const challenged_player_id = Number(el('challenge-select').value);
    const resultado = await apiFetch('/games/challenge', {
      method: 'POST',
      body: { game_id: state.currentGame, challenged_player_id },
    });
    showMessage('game-message', resultado.message || '');
    await refreshGame();
  } catch (err) {
    showMessage('game-message', err.message);
  }
});

el('start-btn').addEventListener('click', async () => {
  showMessage('game-message', '');
  try {
    await apiFetch('/games/start', { method: 'POST', body: { game_id: state.currentGame } });
    await refreshGame();
  } catch (err) {
    showMessage('game-message', err.message);
  }
});

el('end-btn').addEventListener('click', async () => {
  showMessage('game-message', '');
  try {
    await apiFetch('/games/end', { method: 'POST', body: { game_id: state.currentGame } });
    await refreshGame();
  } catch (err) {
    showMessage('game-message', err.message);
  }
});

el('leave-btn').addEventListener('click', async () => {
  showMessage('game-message', '');
  try {
    await apiFetch('/games/leave', { method: 'POST', body: { game_id: state.currentGame } });
    if (state.socket) state.socket.disconnect();
    state.currentGame = null;
    showSection('lobby');
    refreshGames();
  } catch (err) {
    showMessage('game-message', err.message);
  }
});

// --- arranque ---

if (loadSession()) {
  apiFetch('/auth/profile')
    .then((profile) => {
      state.player = profile;
      enterApp();
    })
    .catch(() => {
      clearSession();
      showSection('auth');
    });
} else {
  showSection('auth');
}
