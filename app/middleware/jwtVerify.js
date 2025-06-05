const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function(req, res, next) {
  let token;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) {
    return res.status(401).json({ error: 'Token faltante' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};


