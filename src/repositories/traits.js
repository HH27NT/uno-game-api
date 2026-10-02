// mixins para armar repositorios, cada uno agrega una capacidad
const Readable = (Base) =>
  class extends Base {
    findById(id, options) {
      return this.model.findByPk(id, options);
    }

    findAll(options) {
      return this.model.findAll(options);
    }

    findOne(options) {
      return this.model.findOne(options);
    }
  };

const Creatable = (Base) =>
  class extends Base {
    create(data, options) {
      return this.model.create(data, options);
    }
  };

const Updatable = (Base) =>
  class extends Base {
    async update(id, data, options) {
      const registro = await this.findById(id, options);
      if (!registro) return null;
      return registro.update(data, options);
    }
  };

const Deletable = (Base) =>
  class extends Base {
    async delete(id, options) {
      const registro = await this.findById(id, options);
      if (!registro) return null;
      await registro.destroy(options);
      return true;
    }
  };

module.exports = { Readable, Creatable, Updatable, Deletable };
