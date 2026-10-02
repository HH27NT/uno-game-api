const authService = require('../services/authService');
const { validateRegister, validateLogin } = require('../validators/authValidators');
const { sendResult } = require('../utils/httpResponse');

const register = async (req, res) => {
  const errorValidacion = validateRegister(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const resultado = await authService.register(req.body);
  sendResult(res, resultado.map(() => ({ message: 'jugador registrado correctamente' })), 201);
};

const login = async (req, res) => {
  const errorValidacion = validateLogin(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const { username, password } = req.body;
  const resultado = await authService.login(username, password);
  sendResult(res, resultado.map(({ token }) => ({ access_token: token })));
};

const logout = async (req, res) => {
  await authService.logout(req.player);
  res.json({ message: 'sesion cerrada' });
};

const profile = async (req, res) => {
  res.json(authService.toPublicProfile(req.player));
};

module.exports = { register, login, logout, profile };
