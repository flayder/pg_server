const cron = require('node-cron');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Функция для проверки и удаления истёкших сессий
async function cleanExpiredSessions() {
  try {
    const users = await User.find({ 'sessions.0': { $exists: true } });  // Находим всех пользователей с сессиями

    users.forEach(user => {
      const validSessions = user.sessions.filter(session => {
        try {
          // Проверяем, не истёк ли токен
          jwt.verify(session.token, process.env.JWT_SECRET);
          return true;  // Сессия ещё валидна
        } catch (error) {
          if (error.name === 'TokenExpiredError') {
            // Если токен истек, не добавляем его в валидные сессии
            return false;
          }
        }
      });

      // Если были истёкшие сессии, обновляем список сессий
      if (validSessions.length !== user.sessions.length) {
        user.sessions = validSessions;
        user.save();
      }
    });

    console.log('Очистка истёкших сессий завершена');
  } catch (error) {
    console.error('Ошибка при очистке сессий:', error);
  }
}

// Запуск `cron`-задачи каждую ночь в 00:00
function startCronJobs() {
  cron.schedule('0 0 * * *', cleanExpiredSessions);
}

module.exports = startCronJobs;