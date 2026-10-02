const { cardPoints, sumHandValue, computeFinalScores } = require('../../src/utils/scoreCalculator');

describe('cardPoints', () => {
  test('carta numero vale su numero', () => {
    expect(cardPoints({ type: 'number', value: 6 })).toBe(6);
  });

  test('skip/reverse/draw2 valen 20', () => {
    expect(cardPoints({ type: 'skip' })).toBe(20);
    expect(cardPoints({ type: 'reverse' })).toBe(20);
    expect(cardPoints({ type: 'draw2' })).toBe(20);
  });

  test('wild/wild4 valen 50', () => {
    expect(cardPoints({ type: 'wild' })).toBe(50);
    expect(cardPoints({ type: 'wild4' })).toBe(50);
  });
});

describe('sumHandValue (recursivo)', () => {
  test('una mano vacia vale 0', () => {
    expect(sumHandValue([])).toBe(0);
  });

  test('suma el valor de todas las cartas de la mano', () => {
    const mano = [
      { type: 'number', value: 5 },
      { type: 'skip' },
      { type: 'wild4' },
    ];
    expect(sumHandValue(mano)).toBe(5 + 20 + 50);
  });
});

describe('computeFinalScores', () => {
  test('el ganador se queda con la suma de lo que les quedo a los demas', () => {
    const hands = {
      1: [], // gano, no le quedan cartas
      2: [{ type: 'number', value: 4 }],
      3: [{ type: 'skip' }],
    };

    const puntos = computeFinalScores(hands, 1);

    expect(puntos[1]).toBe(4 + 20);
    expect(puntos[2]).toBe(0);
    expect(puntos[3]).toBe(0);
  });
});
