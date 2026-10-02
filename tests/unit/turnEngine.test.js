const { getNextTurn, resolvePlayCard, drawCard, isPlayableMemo } = require('../../src/utils/turnEngine');

describe('getNextTurn', () => {
  test('avanza un lugar en orden horario', () => {
    const players = ['Alice', 'Bob', 'Charlie', 'Diana'];
    expect(getNextTurn(players, 1)).toEqual({ nextPlayerIndex: 2, nextPlayer: 'Charlie' });
  });

  test('da la vuelta cuando pasa del ultimo jugador', () => {
    const players = ['Alice', 'Bob', 'Charlie', 'Diana'];
    expect(getNextTurn(players, 3)).toEqual({ nextPlayerIndex: 0, nextPlayer: 'Alice' });
  });
});

describe('resolvePlayCard - skip', () => {
  test('salta al siguiente jugador y avanza dos lugares', () => {
    const resultado = resolvePlayCard({
      cardPlayed: 'skip',
      currentPlayerIndex: 2,
      players: ['Alice', 'Bob', 'Charlie', 'Diana'],
      direction: 'clockwise',
    });

    expect(resultado).toEqual({ type: 'skip', nextPlayerIndex: 0, nextPlayer: 'Alice', skippedPlayer: 'Diana' });
  });

  test('tambien detecta el skip con prefijo de color', () => {
    const resultado = resolvePlayCard({
      cardPlayed: 'yellow_skip',
      currentPlayerIndex: 0,
      players: ['Alice', 'Bob', 'Charlie'],
      direction: 'clockwise',
    });

    expect(resultado.skippedPlayer).toBe('Bob');
    expect(resultado.nextPlayer).toBe('Charlie');
  });
});

describe('resolvePlayCard - reverse', () => {
  test('invierte la direccion y recalcula el siguiente jugador', () => {
    const resultado = resolvePlayCard({
      cardPlayed: 'reverse',
      currentPlayerIndex: 2,
      players: ['Alice', 'Bob', 'Charlie', 'Diana'],
      direction: 'clockwise',
    });

    expect(resultado).toEqual({ type: 'reverse', newDirection: 'counterclockwise', nextPlayerIndex: 1, nextPlayer: 'Bob' });
  });

  test('de counterclockwise vuelve a clockwise', () => {
    const resultado = resolvePlayCard({
      cardPlayed: 'reverse',
      currentPlayerIndex: 0,
      players: ['Alice', 'Bob', 'Charlie'],
      direction: 'counterclockwise',
    });

    expect(resultado.newDirection).toBe('clockwise');
  });
});

describe('resolvePlayCard - carta normal', () => {
  test('sin efecto especial, avanza como un turno comun', () => {
    const resultado = resolvePlayCard({
      cardPlayed: 'red_5',
      currentPlayerIndex: 0,
      players: ['Alice', 'Bob', 'Charlie'],
      direction: 'clockwise',
    });

    expect(resultado).toEqual({ type: 'normal', nextPlayerIndex: 1, nextPlayer: 'Bob' });
  });
});

describe('drawCard', () => {
  test('roba una sola carta cuando la primera del mazo ya es jugable', () => {
    const resultado = drawCard(['red_2'], ['red_9', 'blue_3'], 'red_7');
    expect(resultado).toEqual({ newHand: ['red_2', 'red_9'], drawnCard: 'red_9', playable: true });
  });

  test('acumula varias cartas robadas hasta encontrar una jugable', () => {
    const resultado = drawCard(['blue_1'], ['green_4', 'yellow_2', 'red_9'], 'red_7');
    expect(resultado.newHand).toEqual(['blue_1', 'green_4', 'yellow_2', 'red_9']);
    expect(resultado.drawnCard).toBe('red_9');
    expect(resultado.playable).toBe(true);
  });

  test('si se vacia el mazo sin encontrar jugable, devuelve playable false', () => {
    const resultado = drawCard(['blue_1'], ['green_4', 'yellow_2'], 'red_7');
    expect(resultado.newHand).toEqual(['blue_1', 'green_4', 'yellow_2']);
    expect(resultado.drawnCard).toBe('yellow_2');
    expect(resultado.playable).toBe(false);
  });

  test('un comodin siempre es jugable', () => {
    const resultado = drawCard([], ['wild_wild'], 'red_7');
    expect(resultado.playable).toBe(true);
  });
});

describe('isPlayableMemo', () => {
  test('la segunda llamada con los mismos argumentos usa el cache', () => {
    const primero = isPlayableMemo('red_9', 'red_7');
    const segundo = isPlayableMemo('red_9', 'red_7');
    expect(primero).toBe(true);
    expect(segundo).toBe(true);
  });

  test('detecta jugadas no validas', () => {
    expect(isPlayableMemo('green_4', 'red_7')).toBe(false);
  });
});
