const crypto = require('crypto');

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.includes(':')) return false;

  const [salt, hash] = storedHash.split(':');
  const hashIntentado = crypto.scryptSync(password, salt, 64).toString('hex');

  const bufferGuardado = Buffer.from(hash, 'hex');
  const bufferIntentado = Buffer.from(hashIntentado, 'hex');
  if (bufferGuardado.length !== bufferIntentado.length) return false;

  return crypto.timingSafeEqual(bufferGuardado, bufferIntentado);
};

const generateToken = () => crypto.randomBytes(24).toString('hex');

module.exports = { hashPassword, verifyPassword, generateToken };
