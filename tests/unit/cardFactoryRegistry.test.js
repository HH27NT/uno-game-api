// resetModules para probar el registro vacio, sin lo que ya registra deckUtils.js
describe('cardFactoryRegistry', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('buildDeck junta lo que regresan las fabricas registradas', () => {
    const { registerCardFactory, buildDeck } = require('../../src/utils/cardFactoryRegistry');
    registerCardFactory(() => [{ tipo: 'a' }]);
    registerCardFactory(() => [{ tipo: 'b' }, { tipo: 'c' }]);

    expect(buildDeck()).toEqual([{ tipo: 'a' }, { tipo: 'b' }, { tipo: 'c' }]);
  });

  test('sin fabricas registradas el mazo sale vacio', () => {
    const { buildDeck } = require('../../src/utils/cardFactoryRegistry');
    expect(buildDeck()).toEqual([]);
  });
});
