const { hashPassword, comparePassword } = require('../utils/hash');

test('bcrypt hashing and compare', async () => {
  const pwd = 'Secret123';
  const hash = await hashPassword(pwd);
  expect(hash).not.toBe(pwd);
  const ok = await comparePassword(pwd, hash);
  expect(ok).toBe(true);
});
