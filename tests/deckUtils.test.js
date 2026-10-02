// tests de las funciones puras del mazo, no tocan base de datos para nada
const { generateDeck, shuffleDeck, dealCards } = require('../src/utils/deckUtils');

describe('generateDeck', () => {
  test('genera las 108 cartas del uno', () => {
    const deck = generateDeck();
    expect(deck).toHaveLength(108);
  });

  test('tiene 25 cartas de cada color (numeros + especiales)', () => {
    const deck = generateDeck();
    const rojas = deck.filter((carta) => carta.color === 'red');
    expect(rojas).toHaveLength(25);
  });

  test('tiene 8 cartas wild (4 normales + 4 wild4)', () => {
    const deck = generateDeck();
    const wilds = deck.filter((carta) => carta.color === 'wild');
    expect(wilds).toHaveLength(8);
  });

  test('no muta nada entre llamadas, cada deck es independiente', () => {
    const deck1 = generateDeck();
    const deck2 = generateDeck();
    deck1.pop();
    expect(deck2).toHaveLength(108);
  });
});

describe('shuffleDeck', () => {
  test('regresa la misma cantidad de cartas que le mandaron', () => {
    const deck = generateDeck();
    const barajado = shuffleDeck(deck);
    expect(barajado).toHaveLength(deck.length);
  });

  test('no muta el arreglo original', () => {
    const deck = generateDeck();
    const copiaOriginal = [...deck];
    shuffleDeck(deck);
    expect(deck).toEqual(copiaOriginal);
  });

  test('el resultado trae las mismas cartas, solo en otro orden', () => {
    const deck = generateDeck();
    const barajado = shuffleDeck(deck);
    expect(barajado.sort()).not.toBe(deck); // no es la misma referencia
    expect(barajado).toEqual(expect.arrayContaining(deck));
  });
});

describe('dealCards', () => {
  test('reparte la cantidad correcta de cartas por jugador', () => {
    const deck = generateDeck();
    const { hands } = dealCards(deck, 4, 7);
    expect(hands).toHaveLength(4);
    hands.forEach((mano) => expect(mano).toHaveLength(7));
  });

  test('el mazo restante tiene lo que sobra despues de repartir', () => {
    const deck = generateDeck();
    const { hands, remainingDeck } = dealCards(deck, 4, 7);
    const totalRepartidas = hands.flat().length;
    expect(remainingDeck).toHaveLength(deck.length - totalRepartidas);
  });

  test('usa 7 cartas por jugador si no se manda cardsPerPlayer', () => {
    const deck = generateDeck();
    const { hands } = dealCards(deck, 2);
    expect(hands[0]).toHaveLength(7);
  });
});
