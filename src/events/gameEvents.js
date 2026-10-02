// bus de eventos simple: los services avisan cambios, sockets/gameSocket.js los escucha.
// asi el service no depende de socket.io directamente (dip)
const { EventEmitter } = require('events');

const gameEvents = new EventEmitter();

module.exports = gameEvents;
