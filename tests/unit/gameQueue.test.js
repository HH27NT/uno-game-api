const { queueGameTask } = require('../../src/utils/gameQueue');

describe('queueGameTask', () => {
  test('dos tareas del mismo gameId corren en orden, nunca al mismo tiempo', async () => {
    const orden = [];
    let corriendo = false;

    const tarea = (nombre, ms) => async () => {
      expect(corriendo).toBe(false); // si esto falla, hubo condicion de carrera
      corriendo = true;
      await new Promise((resolve) => setTimeout(resolve, ms));
      orden.push(nombre);
      corriendo = false;
    };

    await Promise.all([
      queueGameTask('juego-1', tarea('a', 20)),
      queueGameTask('juego-1', tarea('b', 5)),
      queueGameTask('juego-1', tarea('c', 1)),
    ]);

    expect(orden).toEqual(['a', 'b', 'c']);
  });

  test('tareas de gameId distintos corren en paralelo, no se esperan entre si', async () => {
    const inicio = Date.now();

    await Promise.all([
      queueGameTask('juego-A', () => new Promise((resolve) => setTimeout(resolve, 30))),
      queueGameTask('juego-B', () => new Promise((resolve) => setTimeout(resolve, 30))),
    ]);

    expect(Date.now() - inicio).toBeLessThan(55); // si fueran secuenciales serian ~60ms
  });

  test('si una tarea falla, la cola sigue procesando las siguientes', async () => {
    const orden = [];

    await queueGameTask('juego-2', async () => {
      throw new Error('boom');
    }).catch(() => {});

    await queueGameTask('juego-2', async () => {
      orden.push('sigue funcionando');
    });

    expect(orden).toEqual(['sigue funcionando']);
  });
});
