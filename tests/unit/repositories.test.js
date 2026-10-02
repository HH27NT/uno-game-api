// prueba los traits combinados con un modelo falso, sin tocar sqlite
const Repository = require('../../src/repositories/Repository');
const { Readable, Creatable, Updatable, Deletable } = require('../../src/repositories/traits');

class FakeModel {
  constructor() {
    this.rows = new Map();
    this.nextId = 1;
  }

  async create(data) {
    const id = this.nextId++;
    const rows = this.rows;
    const row = {
      id,
      ...data,
      update: async (nuevo) => Object.assign(row, nuevo),
      destroy: async () => rows.delete(id),
    };
    this.rows.set(id, row);
    return row;
  }

  async findByPk(id) {
    return this.rows.get(Number(id)) || null;
  }

  async findAll() {
    return [...this.rows.values()];
  }

  async findOne({ where }) {
    return [...this.rows.values()].find((row) => Object.entries(where).every(([k, v]) => row[k] === v)) || null;
  }
}

class FullRepository extends Deletable(Updatable(Creatable(Readable(Repository)))) {}

describe('repositorios armados con traits', () => {
  let repo;

  beforeEach(() => {
    repo = new FullRepository(new FakeModel());
  });

  test('create + findById regresan el mismo registro', async () => {
    const creado = await repo.create({ nombre: 'ana' });
    const encontrado = await repo.findById(creado.id);
    expect(encontrado.nombre).toBe('ana');
  });

  test('update cambia los datos de un registro existente', async () => {
    const creado = await repo.create({ nombre: 'ana' });
    const actualizado = await repo.update(creado.id, { nombre: 'ana2' });
    expect(actualizado.nombre).toBe('ana2');
  });

  test('update regresa null si el registro no existe', async () => {
    expect(await repo.update(999, { nombre: 'x' })).toBeNull();
  });

  test('delete borra el registro y regresa true', async () => {
    const creado = await repo.create({ nombre: 'ana' });
    expect(await repo.delete(creado.id)).toBe(true);
    expect(await repo.findById(creado.id)).toBeNull();
  });

  test('delete regresa null si el registro no existe', async () => {
    expect(await repo.delete(999)).toBeNull();
  });

  test('findAll regresa todos los registros creados', async () => {
    await repo.create({ nombre: 'a' });
    await repo.create({ nombre: 'b' });
    expect(await repo.findAll()).toHaveLength(2);
  });

  test('findOne busca por condicion', async () => {
    await repo.create({ nombre: 'ana', edad: 20 });
    const encontrado = await repo.findOne({ where: { nombre: 'ana' } });
    expect(encontrado.edad).toBe(20);
  });
});

describe('CardRepository', () => {
  test('no tiene metodo create de un solo registro (no usa ese mixin)', () => {
    const CardRepository = require('../../src/repositories/CardRepository');
    const cardRepo = new CardRepository();
    expect(cardRepo.create).toBeUndefined();
    expect(typeof cardRepo.bulkCreate).toBe('function');
  });
});
