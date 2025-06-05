const crypto = require('crypto');

function genSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function sha256(password, salt) {
  return crypto
    .createHmac('sha256', salt)
    .update(password)
    .digest('hex');
}

module.exports = { genSalt, sha256 };

