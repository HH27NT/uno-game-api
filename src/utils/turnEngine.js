// motor de turnos sin estado, no toca la db

const pipe = (...fns) => (input) => fns.reduce((valor, fn) => fn(valor), input);

// avanza el indice N pasos, dando la vuelta cuando pasa del ultimo jugador
const advanceIndex = (index, numPlayers, steps = 1) =>
  Array.from({ length: steps }).reduce((acc) => (acc + 1) % numPlayers, index);

const getNextTurn = (players, currentPlayerIndex) => {
  const nextPlayerIndex = advanceIndex(currentPlayerIndex, players.length, 1);
  return { nextPlayerIndex, nextPlayer: players[nextPlayerIndex] };
};

const cardTypeOf = (cardPlayed) => cardPlayed.split('_').pop();
const isSkip = (cardPlayed) => cardTypeOf(cardPlayed) === 'skip';
const isReverse = (cardPlayed) => cardTypeOf(cardPlayed) === 'reverse';

const applySkip = (players, currentPlayerIndex) => {
  const skippedIndex = advanceIndex(currentPlayerIndex, players.length, 1);
  const nextPlayerIndex = advanceIndex(currentPlayerIndex, players.length, 2);
  return {
    nextPlayerIndex,
    nextPlayer: players[nextPlayerIndex],
    skippedPlayer: players[skippedIndex],
  };
};

const opposite = (direction) => (direction === 'clockwise' ? 'counterclockwise' : 'clockwise');

// se da vuelta el array de jugadores, se ubica ahi al jugador actual y se avanza un lugar
const reversePlayers = (estado) => ({ ...estado, reversed: [...estado.players].reverse() });

const locateInReversed = (estado) => ({
  ...estado,
  indexInReversed: estado.players.length - 1 - estado.currentPlayerIndex,
});

const advanceInReversed = (estado) => ({
  ...estado,
  nextIndexInReversed: (estado.indexInReversed + 1) % estado.reversed.length,
});

const mapBackToOriginal = (estado) => {
  const nextPlayer = estado.reversed[estado.nextIndexInReversed];
  return { ...estado, nextPlayer, nextPlayerIndex: estado.players.indexOf(nextPlayer) };
};

const reverseDirectionPipeline = pipe(reversePlayers, locateInReversed, advanceInReversed, mapBackToOriginal);

const applyReverse = (players, currentPlayerIndex, direction) => {
  const { nextPlayer, nextPlayerIndex } = reverseDirectionPipeline({ players, currentPlayerIndex });
  return { newDirection: opposite(direction), nextPlayerIndex, nextPlayer };
};

// de las reglas especiales conocidas, se queda con la que aplica a esta carta
const cardHandlers = [
  { matches: isSkip, resolve: (players, currentPlayerIndex) => ({ type: 'skip', ...applySkip(players, currentPlayerIndex) }) },
  {
    matches: isReverse,
    resolve: (players, currentPlayerIndex, direction) => ({ type: 'reverse', ...applyReverse(players, currentPlayerIndex, direction) }),
  },
];

const resolvePlayCard = ({ cardPlayed, currentPlayerIndex, players, direction }) => {
  const handler = cardHandlers.filter((h) => h.matches(cardPlayed))[0];
  if (handler) return handler.resolve(players, currentPlayerIndex, direction);
  return { type: 'normal', ...getNextTurn(players, currentPlayerIndex) };
};

// guarda en cache si una carta es jugable contra la carta actual, para no recalcular
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = args.join('|');
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key);
  };
};

const parseCard = (cardStr) => {
  const [color, ...resto] = cardStr.split('_');
  return { color, type: resto.join('_') };
};

const isPlayable = (cardStr, currentCardStr) => {
  const carta = parseCard(cardStr);
  const actual = parseCard(currentCardStr);
  if (carta.color === 'wild') return true;
  if (carta.color === actual.color) return true;
  return carta.type === actual.type;
};

const isPlayableMemo = memoize(isPlayable);

// va sacando cartas del mazo hasta encontrar una jugable o hasta vaciarlo
const drawUntilPlayable = (deck, currentCard, drawn = []) => {
  if (deck.length === 0) {
    const drawnCard = drawn[drawn.length - 1] ?? null;
    return { drawn, drawnCard, playable: drawnCard ? isPlayableMemo(drawnCard, currentCard) : false };
  }

  const [carta, ...restoDeck] = deck;
  const nuevoDrawn = [...drawn, carta];

  if (isPlayableMemo(carta, currentCard)) {
    return { drawn: nuevoDrawn, drawnCard: carta, playable: true };
  }

  return drawUntilPlayable(restoDeck, currentCard, nuevoDrawn);
};

const drawCard = (playerHand, deck, currentCard) => {
  const { drawn, drawnCard, playable } = drawUntilPlayable(deck, currentCard);
  return { newHand: [...playerHand, ...drawn], drawnCard, playable };
};

module.exports = { getNextTurn, resolvePlayCard, drawCard, isPlayableMemo };
