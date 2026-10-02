const http = require('http');
const { Server } = require('socket.io');
const initGameSocket = require('./sockets/gameSocket');

// junta express + socket.io sobre el mismo server http. separado de server.js para
// poder reusarlo en los tests de sockets sin levantar el proceso completo
const createServer = (app) => {
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });
  initGameSocket(io);
  return { httpServer, io };
};

module.exports = createServer;
