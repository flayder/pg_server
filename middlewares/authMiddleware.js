const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.cookies.token; // Получаем токен из кук

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Unauthorized: Invalid token' });
    }

    req.user = user;
    next();
  });
};