// ocp: generateDeck no se toca para agregar un tipo de carta nuevo, se registra otra fabrica aqui
const factories = [];

const registerCardFactory = (factory) => {
  factories.push(factory);
};

const buildDeck = () => factories.flatMap((factory) => factory());

module.exports = { registerCardFactory, buildDeck };
