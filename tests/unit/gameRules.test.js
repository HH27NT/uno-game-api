const { cardMatchesTop, playableCards, hasPlayableCard, nextPlayerIndex } = require('../../src/utils/gameRules');

describe('cardMatchesTop', () => {
  test('cualquier carta es valida si todavia no hay carta en el descarte', () => {
    expect(cardMatchesTop({ color: 'red', type: 'number', value: 5 }, null)).toBe(true);
  });

  test('un comodin siempre es valido', () => {
    expect(cardMatchesTop({ color: 'wild', type: 'wild', value: null }, { color: 'blue', type: 'number', value: 3 })).toBe(true);
  });

  test('mismo color es valido aunque el numero sea distinto', () => {
    const top = { color: 'green', type: 'number', value: 7 };
    expect(cardMatchesTop({ color: 'green', type: 'number', value: 2 }, top)).toBe(true);
  });

  test('mismo numero en otro color es valido', () => {
    const top = { color: 'green', type: 'number', value: 7 };
    expect(cardMatchesTop({ color: 'red', type: 'number', value: 7 }, top)).toBe(true);
  });

  test('mismo simbolo especial en otro color es valido', () => {
    const top = { color: 'green', type: 'skip', value: null };
    expect(cardMatchesTop({ color: 'red', type: 'skip', value: null }, top)).toBe(true);
  });

  test('color, numero y simbolo distintos no es valido', () => {
    const top = { color: 'green', type: 'number', value: 7 };
    expect(cardMatchesTop({ color: 'red', type: 'number', value: 3 }, top)).toBe(false);
  });
});

describe('playableCards / hasPlayableCard (generador)', () => {
  const top = { color: 'green', type: 'number', value: 7 };
  const mano = [
    { id: 1, color: 'red', type: 'number', value: 3 },
    { id: 2, color: 'green', type: 'number', value: 9 },
    { id: 3, color: 'blue', type: 'skip', value: null },
  ];

  test('solo emite las cartas que hacen match', () => {
    const jugables = [...playableCards(mano, top)];
    expect(jugables).toEqual([mano[1]]);
  });

  test('hasPlayableCard es true si al menos una hace match', () => {
    expect(hasPlayableCard(mano, top)).toBe(true);
  });

  test('hasPlayableCard es false si ninguna hace match', () => {
    const manoSinJugables = [mano[0], mano[2]];
    expect(hasPlayableCard(manoSinJugables, top)).toBe(false);
  });

  test('el generador no recorre mas cartas de las necesarias para encontrar la primera', () => {
    const manoConEspia = [
      { id: 1, color: 'green', type: 'number', value: 1 }, // ya hace match, deberia bastar
      { id: 2, get color() { throw new Error('no deberia leerse esta carta'); } },
    ];
    expect(() => hasPlayableCard(manoConEspia, top)).not.toThrow();
  });
});

describe('nextPlayerIndex', () => {
  test('carta normal avanza un lugar en la direccion actual', () => {
    const { index, direction } = nextPlayerIndex(0, 4, 1, { type: 'number', value: 5 });
    expect(index).toBe(1);
    expect(direction).toBe(1);
  });

  test('skip salta un jugador', () => {
    const { index } = nextPlayerIndex(0, 4, 1, { type: 'skip' });
    expect(index).toBe(2);
  });

  test('draw2 salta un jugador igual que skip', () => {
    const { index } = nextPlayerIndex(0, 4, 1, { type: 'draw2' });
    expect(index).toBe(2);
  });

  test('reverse con mas de 2 jugadores invierte la direccion y avanza 1', () => {
    const { index, direction } = nextPlayerIndex(2, 4, 1, { type: 'reverse' });
    expect(direction).toBe(-1);
    expect(index).toBe(1);
  });

  test('reverse con 2 jugadores funciona como skip (le vuelve a tocar al mismo)', () => {
    const { index } = nextPlayerIndex(0, 2, 1, { type: 'reverse' });
    expect(index).toBe(0);
  });

  test('el indice da la vuelta cuando pasa del ultimo jugador', () => {
    const { index } = nextPlayerIndex(3, 4, 1, { type: 'number', value: 1 });
    expect(index).toBe(0);
  });

  test('funciona en direccion negativa (sentido izquierdo)', () => {
    const { index } = nextPlayerIndex(0, 4, -1, { type: 'number', value: 1 });
    expect(index).toBe(3);
  });
});
