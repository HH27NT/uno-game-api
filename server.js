require('dotenv').config();
const app = require('./src/app');
const sequelize = require('./src/config/database');
require('./src/models'); // fuerza a que se registren las asociaciones antes del sync
const createServer = require('./src/createServer');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 3000;

// devuelve una promesa que resuelve cuando el server ya esta escuchando,
// asi la app de escritorio (electron/main.js) sabe cuando puede abrir la ventana
const start = async () => {
  await sequelize.authenticate();
  logger.info('conexion a la base de datos OK');

  await sequelize.sync(); // en un proyecto real usariamos migrations, aqui con sync basta
  logger.info('modelos sincronizados');

  const { httpServer } = createServer(app);

  return new Promise((resolve) => {
    httpServer.listen(PORT, () => {
      logger.info(`servidor UNO corriendo en http://localhost:${PORT}`);
      resolve({ httpServer, port: PORT });
    });
  });
};

if (require.main === module) {
  start().catch((err) => {
    logger.error('no se pudo levantar el servidor', { error: err.message });
    process.exit(1);
  });
}

module.exports = { start };
