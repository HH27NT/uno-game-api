// reglas puras del juego: que carta es jugable y a quien le toca despues

const cardMatchesTop = (card, topCard) => {
  if (!topCard) return true;
  if (card.color === 'wild') return true;
  if (card.color === topCard.color) return true;
  if (card.type === topCard.type && card.type !== 'number') return true;
  return card.type === 'number' && topCard.type === 'number' && card.value === topCard.value;
};

// va emitiendo las cartas jugables de la mano de a una, sin armar el array completo
// primero. permite cortar apenas se encuentra la primera (ver hasPlayableCard)
function* playableCards(hand, topCard) {
  for (const card of hand) {
    if (cardMatchesTop(card, topCard)) yield card;
  }
}

const hasPlayableCard = (hand, topCard) => !playableCards(hand, topCard).next().done;

// calcula a quien le toca despues segun el efecto de la carta jugada
const nextPlayerIndex = (currentIndex, numPlayers, direction, card) => {
  let nuevaDireccion = direction;
  let paso = 1;

  if (card && card.type === 'reverse') {
    nuevaDireccion = direction * -1;
    paso = numPlayers === 2 ? 2 : 1; // con 2 jugadores el reverse funciona como skip
  } else if (card && ['skip', 'draw2', 'wild4'].includes(card.type)) {
    paso = 2;
  }

  const indice = (((currentIndex + nuevaDireccion * paso) % numPlayers) + numPlayers) % numPlayers;
  return { index: indice, direction: nuevaDireccion };
};

module.exports = { cardMatchesTop, playableCards, hasPlayableCard, nextPlayerIndex };
