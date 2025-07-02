const cron = require('node-cron');
const User = require('../models/User'); // Путь к модели User

// Функция для проверки подписки
async function checkSubscriptionStatus() {
  const currentDate = new Date();

  // Находим пользователей с истекшей подпиской, у которых статус 'bill'
  const users = await User.find({
    subscriptionExpires: { $lte: currentDate },
    subscriptionStatus: 'bill',
  });

  // Обновляем статус подписки на 'unbill'
  for (const user of users) {
    user.subscriptionStatus = 'unbill';
    await user.save();
    console.log(`Подписка пользователя ${user.email} была обновлена на 'unbill'`);
  }
}

// Запуск задачи каждую ночь в 00:00
cron.schedule('0 0 * * *', () => {
  console.log('Запускается проверка подписки...');
  checkSubscriptionStatus();
});

module.exports = checkSubscriptionStatus;