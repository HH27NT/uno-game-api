const { registerCardFactory, buildDeck } = require('./cardFactoryRegistry');

const COLORS = ['red', 'yellow', 'green', 'blue'];

const numberCardFactory = () =>
  COLORS.flatMap((color) =>
    [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9].map((value) => ({
      color,
      type: 'number',
      value,
    }))
  );

const specialCardFactory = () =>
  COLORS.flatMap((color) =>
    ['skip', 'reverse', 'draw2'].flatMap((type) => [
      { color, type, value: null },
      { color, type, value: null },
    ])
  );

const wildCardFactory = () =>
  Array.from({ length: 4 }, () => ({ color: 'wild', type: 'wild', value: null }));

const wild4CardFactory = () =>
  Array.from({ length: 4 }, () => ({ color: 'wild', type: 'wild4', value: null }));

registerCardFactory(numberCardFactory);
registerCardFactory(specialCardFactory);
registerCardFactory(wildCardFactory);
registerCardFactory(wild4CardFactory);

const generateDeck = () => buildDeck();

const shuffleDeck = (deck) => {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// reparte de forma recursiva, una ronda a la vez: en cada llamada le toca una carta
// a cada jugador, hasta llegar a cardsPerPlayer rondas
const dealRound = (deck, numPlayers, cardsPerPlayer, ronda, hands) => {
  if (ronda === cardsPerPlayer) return hands;

  const cartaIndex = ronda * numPlayers;
  const siguientesHands = hands.map((mano, jugador) => [...mano, deck[cartaIndex + jugador]]);

  return dealRound(deck, numPlayers, cardsPerPlayer, ronda + 1, siguientesHands);
};

const dealCards = (deck, numPlayers, cardsPerPlayer = 7) => {
  const handsVacias = Array.from({ length: numPlayers }, () => []);
  const hands = dealRound(deck, numPlayers, cardsPerPlayer, 0, handsVacias);
  const remainingDeck = deck.slice(numPlayers * cardsPerPlayer);
  return { hands, remainingDeck };
};

// junta el descarte de vuelta al mazo cuando este se vacia (deja la carta de arriba aparte)
const reshuffleDiscardIntoDeck = (discardPile) => {
  if (discardPile.length <= 1) return { newDeck: [], keptTopCard: discardPile[0] || null };

  const [top, ...resto] = discardPile;
  return { newDeck: shuffleDeck(resto), keptTopCard: top };
};

module.exports = { generateDeck, shuffleDeck, dealCards, reshuffleDiscardIntoDeck, registerCardFactory };
