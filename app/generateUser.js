// generateUser.js
const { genSalt, sha256 } = require('./utils/hash');

const salt = genSalt();
const hash = sha256('MiPass123', salt);

console.log('SALT=', salt);
console.log('HASH=', hash);
