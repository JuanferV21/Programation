// generateUser.js
// Utility script that prints the bcrypt hash of a sample password.
const { hashPassword } = require('./utils/hash');

(async () => {
  const password = 'MiPass123';
  const hash = await hashPassword(password);
  console.log('PASSWORD=', password);
  console.log('HASH=', hash);
})();
