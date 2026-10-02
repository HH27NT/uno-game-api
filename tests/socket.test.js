// multijugador por websocket join transmite la lista de jugadores conectados,
// y los eventos de una jugada (game:update) llegan a todos los que estan en esa sala
const { io: ioClient } = require('socket.io-client');
const createServer = require('../src/createServer');
const app = require('../src/app');
const gameEvents = require('../src/events/gameEvents');

let httpServer;
let baseUrl;

beforeAll((done) => {
  ({ httpServer } = createServer(app));
  httpServer.listen(0, () => {
    baseUrl = `http://localhost:${httpServer.address().port}`;
    done();
  });
});

afterAll((done) => {
  httpServer.close(done);
});

const conectar = () => ioClient(baseUrl, { transports: ['websocket'], forceNew: true });

describe('multijugador por websocket', () => {
  test('cuando un jugador se une, todos en la sala reciben player-joined con la lista', (done) => {
    // primero se mete OtroJugador y se espera a que el server confirme su propio join,
    // recien ahi se conecta NewPlayer (si se conectaban los dos a la vez, a veces
    // OtroJugador todavia no estaba en la sala cuando llegaba el mensaje de NewPlayer)
    const socket2 = conectar();
    let socket1;

    socket2.on('connect', () => {
      socket2.emit('join', { gameId: 'sala-1', playerName: 'OtroJugador' });
    });

    socket2.on('player-joined', (payload) => {
      if (payload.message.includes('OtroJugador')) {
        socket1 = conectar();
        socket1.on('connect', () => {
          socket1.emit('join', { gameId: 'sala-1', playerName: 'NewPlayer' });
        });
        return;
      }

      expect(payload.message).toBe('NewPlayer has joined the game.');
      expect(payload.players).toEqual(expect.arrayContaining(['NewPlayer']));
      socket1.disconnect();
      socket2.disconnect();
      done();
    });
  });

  test('un game:update emitido internamente se reenvia a los sockets de esa partida', (done) => {
    const socket = conectar();

    socket.on('connect', () => {
      socket.emit('join', { gameId: 'sala-2', playerName: 'Espia' });
      // espera a que el join se procese antes de disparar el evento interno
      setTimeout(() => {
        gameEvents.emit('game:update', { gameId: 'sala-2', type: 'card-played', payload: { player: 'x' } });
      }, 50);
    });

    socket.on('card-played', (payload) => {
      expect(payload).toEqual({ player: 'x' });
      socket.disconnect();
      done();
    });
  });
});
