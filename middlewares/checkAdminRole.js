const User = require('../models/User');

// Middleware для проверки роли администратора
async function checkAdminRole(req, res, next) {
  try {
    // Извлекаем ID пользователя из токена
    const userId = req.user.userId;

    // Находим пользователя в базе данных по его ID
    const user = await User.findById(userId);

    // Проверяем, что пользователь существует и его роль - "Admin"
    if (user && user.role === 'admin') {
      next();  // Если пользователь - администратор, продолжаем выполнение запроса
    } else {
      return res.status(403).json({ message: 'Доступ запрещен: требуется роль администратора' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка сервера', error });
  }
}

module.exports = checkAdminRole;