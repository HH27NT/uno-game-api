// srp: esto solo valida forma de los datos, no toca el service ni la respuesta http
const validateRegister = ({ username, email, password } = {}) => {
  if (!username || !email || !password) return 'faltan datos obligatorios';
  if (password.length < 6) return 'el password debe tener minimo 6 caracteres';
  return null;
};

const validateLogin = ({ username, password } = {}) => {
  if (!username || !password) return 'faltan username o password';
  return null;
};

module.exports = { validateRegister, validateLogin };
