// puntaje oficial de uno: numero = su valor, especiales = 20, comodines = 50
const cardPoints = (card) => {
  if (card.type === 'number') return card.value;
  if (card.type === 'wild' || card.type === 'wild4') return 50;
  return 20; // skip, reverse, draw2
};

// suma recursiva: la carta de adelante mas la suma del resto de la mano
const sumHandValue = (cards) => {
  if (cards.length === 0) return 0;
  const [primera, ...resto] = cards;
  return cardPoints(primera) + sumHandValue(resto);
};

// el ganador se queda con la suma de lo que les quedo en la mano a los demas
const computeFinalScores = (handsByPlayerId, winnerId) => {
  const puntos = Object.fromEntries(Object.keys(handsByPlayerId).map((playerId) => [playerId, 0]));

  Object.entries(handsByPlayerId).forEach(([playerId, mano]) => {
    if (Number(playerId) !== Number(winnerId)) {
      puntos[winnerId] = (puntos[winnerId] || 0) + sumHandValue(mano);
    }
  });

  return puntos;
};

module.exports = { cardPoints, sumHandValue, computeFinalScores };
