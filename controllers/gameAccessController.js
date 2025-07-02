const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Контроллер для проверки доступа к игре
exports.checkGameAccess = async (req, res) => {
  try {
    let user = null;

    // Получаем токен из куки
    const token = req.cookies.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.userId);
    }

    let access = 'demo';

    if (!user) {
      access = 'demo';
    } else if (user.role === 'admin') {
      access = 'full';
    } else if (user.role === 'user') {
      if (user.subscription === 'bill') {
        access = 'full';
      } else if (user.subscription === 'unbill') {
        access = 'demo';
      }
    }

    res.status(200).json({ access });

  } catch (error) {
    res.status(401).json({ message: 'Invalid token or authorization error', error });
  }
};
