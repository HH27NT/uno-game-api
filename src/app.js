const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const logger = require('./config/logger');

const app = express();

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

app.use('/api', routes);
app.use('/app', express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.json({ message: 'UNO backend corriendo, ve a /api para los endpoints' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'ruta no encontrada' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ error: 'algo salio mal en el servidor' });
});

module.exports = app;
