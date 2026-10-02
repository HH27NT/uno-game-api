// mismo patron que actividad-2-event-loop/src/store.js pero por partida: encola las
// acciones que mutan un juego para que dos jugadas del mismo gameId nunca corran en carrera,
// mientras que partidas distintas se siguen procesando en paralelo sin esperarse entre si
const gameQueues = new Map();

function queueGameTask(gameId, taskFn) {
  const colaActual = gameQueues.get(gameId) || Promise.resolve();
  const siguiente = colaActual.catch(() => {}).then(taskFn);
  gameQueues.set(gameId, siguiente);
  return siguiente;
}

module.exports = { queueGameTask };
