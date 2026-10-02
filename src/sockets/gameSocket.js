const gameEvents = require('../events/gameEvents');
const logger = require('../config/logger');

// registra los sockets conectados a cada partida (Map = estructura concurrente simple,
// una entrada por gameId con el set de sockets de esa sala)
const initGameSocket = (io) => {
  io.on('connection', (socket) => {
    socket.on('join', ({ gameId, playerName }) => {
      if (!gameId || !playerName) return;

      const room = `game:${gameId}`;
      socket.join(room);
      socket.data.playerName = playerName;

      const jugadoresEnSala = [...(io.sockets.adapter.rooms.get(room) || [])].map(
        (socketId) => io.sockets.sockets.get(socketId)?.data.playerName
      );

      io.to(room).emit('player-joined', {
        message: `${playerName} has joined the game.`,
        players: jugadoresEnSala.filter(Boolean),
      });
    });
  });

  // cada mutacion de una partida (jugar, robar, decir uno, desafiar, fin de juego...)
  // se reenvia a todos los clientes conectados a esa sala en tiempo real
  gameEvents.on('game:update', ({ gameId, type, payload }) => {
    io.to(`game:${gameId}`).emit(type, payload);
    logger.info(`game:${gameId} -> ${type}`, payload);
  });
};

module.exports = initGameSocket;
