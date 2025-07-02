const User = require('../models/User');  // Подключаем модель пользователя

// Контроллер для получения всех пользователей
exports.getAllUsers = async (req, res) => {
  try {
    // Находим всех пользователей
    const users = await User.find().select('-password').lean();
    
    // Возвращаем список пользователей
    res.status(200).json(users);
  } catch (error) {
    // Возвращаем ошибку, если что-то пошло не так
    res.status(500).json({ message: 'Ошибка сервера при получении пользователей', error });
  }
};

// Контроллер для получения информации о пользователе
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Найдем пользователя по его ID
    const user = await User.findById(userId).select('-password').lean();
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении данных пользователя', error });
  }
};


// Контроллер для удаления пользователя по ID
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Проверяем, был ли передан userId
    if (!userId) {
      return res.status(400).json({ message: 'ID пользователя обязателен' });
    }

    // Ищем и удаляем пользователя по ID
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.status(200).json({ message: 'Пользователь успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении пользователя', error });
  }
};

//Очистка сессий пользователя
exports.clearUserSessions = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Проверяем, был ли передан email
    if (!email) {
      return res.status(400).json({ message: 'Email обязателен' });
    }

    // Ищем пользователя по email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Очищаем сессии пользователя
    user.sessions = [];
    await user.save();

    res.status(200).json({ message: 'Все сессии пользователя успешно удалены' });
  } catch (error) {
    console.error('Ошибка при очистке сессий:', error);
    res.status(500).json({ message: 'Ошибка сервера при очистке сессий', error });
  }
};

// Контроллер для обновления пользователя
exports.updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Исключаем возможность изменения пароля через этот контроллер
    if (updates.password) {
      return res.status(400).json({ message: 'Нельзя обновить пароль через этот маршрут' });
    }

    // Обновляем пользователя
    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.status(200).json({ message: 'Пользователь успешно обновлен', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении пользователя', error });
  }
};