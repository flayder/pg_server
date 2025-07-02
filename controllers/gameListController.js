require('dotenv').config(); 
const jwt = require('jsonwebtoken');
const Game = require('../models/Game'); // Подключаем модель игры
const Tag = require('../models/Tag');
const User = require('../models/User');
const mongoose = require('mongoose');
const fs = require("fs");
const path = require("path");
const { verifyHcaptcha } = require('../middlewares/validators');
const { transporter } = require('../global/func/transporter');
const { ObjectId } = require('mongodb');

//Отправка письма из формы
exports.sendContactMessage = async (req, res) => {
  try {
    const { email, message, captcha } = req.body;

    if(!captcha) {
     return res.status(400).json({ message: "Captcha is required" });
    }

    var captchaCheck = await verifyHcaptcha(captcha);

    if(!captchaCheck) {
     return res.status(400).json({ message: "Captcha is not correct" });
    }

    if (!email || !message) {
      return res.status(400).json({ message: "Email and message are required" });
    }

    (async () => {
      try {
        //console.log('>>> [contact] Входящий POST-запрос:', req.body); // ← Лог

        const info = await transporter().sendMail({
          from: `"Support" <${process.env.SUPPORT_EMAIL}>`,
          to: process.env.SUPPORT_EMAIL,
          subject: 'Новое сообщение с формы contact us',
          html: `<b>Email: </b> ${email}<br/><b>Сообщение: </b> ${message}`
        });

        //console.log('>>> [contact] Письмо отправлено:', info.messageId); // ← Лог
      } catch (err) {
        console.error('>>> [contact] Ошибка при отправке письма:', err); // ← Лог
      }
    })();

    //uyndxjjwssrsvxgb

    // Здесь можно отправить письмо через Mailgun / Nodemailer
    // или просто сохранить в файл (как временный лог)

    const logErrorPath = path.join(__dirname, "../logs/error.log");

    const logPath = path.join(__dirname, "../logs/contact-messages.log");

    const logEntry = `[${new Date().toISOString()}] FROM: ${email}\n${message}\n\n`;

    fs.appendFileSync(logPath, logEntry);

    

    res.status(200).json({ message: "Message received successfully" });
  } catch (error) {
    console.error("Contact Us Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Контроллер для поиска игр
exports.searchGames = async (req, res) => {
  try {
    // Получаем поисковый запрос
    const query = req.query.query;  // Это строка, по которой будем искать

    if (!query) {
      return res.status(400).json({ message: "Поисковый запрос не может быть пустым." });
    }

    // Поиск по названию, описанию и вложенным тегам (поле `name` внутри `tags`)
    const games = await Game.find(
      {
        $or: [
          { title: { $regex: query, $options: 'i' } },  // Поиск в названии
          { description: { $regex: query, $options: 'i' } },  // Поиск в описании
          { tags: { $elemMatch: { name: { $regex: query, $options: 'i' } } } } // Поиск по name в теге
        ]
      },
      {
        _id: 1,
        title: 1,
        description: 1,
        image: 1,
        path: 1
      }
    );

    // Если игры не найдены
    if (games.length === 0) {
      return res.status(404).json({ message: "Games not found." });
    }

    // Отправляем найденные игры
    res.status(200).json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


//Получение списка всех игр
exports.getGameList = async (req, res) => {
  try {
    const token = req.cookies.token;
    let userId = null;
    let isAdmin = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;

        const user = await User.findById(userId);
        if (user && user.role === 'admin') {
          isAdmin = true;
        }
      } catch (error) {
        console.error('Ошибка при валидации токена или получении пользователя:', error.message);
      }
    }

    // Фильтрация игр: если не админ, то показываем только активные
    const filter = isAdmin ? {} : { active: true };

    const games = await Game.find(filter, 'title description likes dislikes views image images path date active').sort({ date: -1 });

    const gameList = games.map(game => {
      let likedByUser = false;
      let dislikedByUser = false;

      if (userId) {
        likedByUser = game.likes.some(id => id.equals(userId));
        dislikedByUser = game.dislikes.some(id => id.equals(userId));
      }

      return {
        id: game._id,
        title: game.title,
        description: game.description,
        likes: game.likes.length,
        dislikes: game.dislikes.length,
        views: game.views,
        preview: game.image,
        images: game.images,
        path: game.path,
        active: game.active,
        likedByUser,
        dislikedByUser,
        date: game.date
      };
    });
    res.json(gameList);
  } catch (error) {
    console.error('Ошибка при получении списка игр:', error);
    res.status(500).json({ message: 'Ошибка при получении списка игр', error });
  }
};



// Получение тегов
exports.getTags = async (req, res) => {
  try {
    const tags = await Tag.find({}, 'name');
    res.status(200).json(tags);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении тегов', error });
  }
};

// Получение списка игр по тегу или множеству тегов
exports.getGamesByTags = async (req, res) => {
  try {
    const { tags } = req.query; // Получаем теги из запроса (?tags=milf,anal)

    if (!tags) {
      return res.status(400).json({ message: "Теги не были переданы" });
    }

    const tagsArray = tags.split(","); // Преобразуем строку тегов в массив
    console.log("Запрос пришел с тегами:", tagsArray);

    // Получаем токен из куки
    const token = req.cookies.token;
    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId; // Извлекаем ID пользователя
      } catch (error) {
        console.error('Ошибка при валидации токена:', error.message);
      }
    }

    // Теперь ищем игры **по `tags.name`**, а не по `_id`
    const games = await Game.find({
      active: true,
      "tags.name": { $all: tagsArray }
    });

    const gameList = games.map(game => {
      let likedByUser = false;
      let dislikedByUser = false;

      if (userId) {
        likedByUser = game.likes.some(id => id.equals(userId));
        dislikedByUser = game.dislikes.some(id => id.equals(userId));
      }

      return {
        id: game._id,
        title: game.title,
        description: game.description,
        path: game.path,
        preview: game.image,
        images: game.images,
        likes: game.likes.length,
        dislikes: game.dislikes.length,
        views: game.views,
        likedByUser,   // Добавляем лайк пользователя
        dislikedByUser // Добавляем дизлайк пользователя
      };
    });

    res.status(200).json(gameList);
  } catch (error) {
    console.error("Ошибка при получении игр:", error);
    res.status(500).json({ message: "Ошибка сервера", error });
  }
};


//Получить игру по ее пути
exports.getGameById = async (req, res) => {
  try {
    const { gameName } = req.params;

    // Получаем токен из куки
    const token = req.cookies.token;

    // Ищем игру по path (gameName) и увеличиваем просмотры
    const game = await Game.findOneAndUpdate(
      { path: gameName },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('tags', 'name');

    if (!game) {
      return res.status(404).json({ message: 'Игра не найдена' });
    }

    let gamePath = game.demoPath; // По умолчанию demoPath
    let likedByUser = false;
    let dislikedByUser = false;

    if (token) {
      try {
        // Декодируем токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Проверяем лайк/дизлайк
        likedByUser = game.likes.some(id => id.equals(userId));
        dislikedByUser = game.dislikes.some(id => id.equals(userId));

        // Проверяем роль и подписку
        const user = await User.findById(userId);
        if (user && (user.role === 'admin' || user.subscriptionStatus === 'bill')) {
          gamePath = game.fullPath;
        }
      } catch (error) {
        console.error('Ошибка при валидации токена:', error.message);
      }
    }

    // Возвращаем данные об игре
    res.json({
      id: game._id,
      title: game.title,
      description: game.description,
      tags: game.tags.map(tag => ({ id: tag._id, name: tag.name })),
      image: game.image,
      images: game.images,
      gamePath,
      path: game.path,
      views: game.views,
      likes: game.likes.length,
      dislikes: game.dislikes.length,
      likedByUser,   // Добавляем инфо о лайке пользователя
      dislikedByUser // Добавляем инфо о дизлайке пользователя
    });

  } catch (error) {
    console.error('Ошибка при получении игры:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

//Получить рандомную игру
exports.getRandomGame = async (req, res) => {
  try {
    const id = req.query.id;
    let userId = null;

    // Получаем токен из куки
    const token = req.cookies.token;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId; // Извлекаем ID пользователя
      } catch (error) {
        console.error('Ошибка при валидации токена:', error.message);
      }
    }
    const matchStage = { active: true };

    if (id) {
      matchStage._id = { $ne: new ObjectId(id) };
    }

    const dbParams = [
      { $match: matchStage },
      { $sample: { size: 1 } }
    ];

    // Выбираем случайную игру
    var randomGameArray = await Game.aggregate(dbParams);

    if (randomGameArray.length === 0) {
      //return res.status(404).json({ message: 'Игры не найдены' });
      randomGameArray = await Game.aggregate(dbParams);
    }

    const game = randomGameArray[0];

    let gamePath = game?.demoPath;
    let likedByUser = false;
    let dislikedByUser = false;

    if (userId) {
      likedByUser = game.likes.some(id => id.equals(userId));
      dislikedByUser = game.dislikes.some(id => id.equals(userId));

      // Проверяем роль и подписку
      const user = await User.findById(userId);
      if (user && (user.role === 'admin' || user.subscriptionStatus === 'bill')) {
        gamePath = game.fullPath;
      }
    }

    // Формируем объект ответа
    res.json({ 
      id: game._id,
      title: game.title,
      description: game.description,
      tags: game.tags.map(tag => ({ id: tag._id, name: tag.name })),
      preview: game.image,
      gamePath,
      path: game.path,
      views: game.views,
      likes: game.likes.length,
      dislikes: game.dislikes.length,
      likedByUser,   // Добавляем инфо о лайке пользователя
      dislikedByUser // Добавляем инфо о дизлайке пользователя
    });

  } catch (error) {
    console.error('Ошибка при получении случайной игры:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};


// Добавление или удаление лайка
exports.toggleLike = async (req, res) => {
  try {
      const { path } = req.params;
      const userId = req.user?.userId;

      console.log(userId);

      if (!userId) {
        return res.status(400).json({ success: false, message: "Ошибка: нет идентификатора пользователя" });
    }

      const game = await Game.findOne({ path });
      if (!game) {
          return res.status(404).json({ success: false, message: 'Игра не найдена' });
      }

      // Удаляем пользователя из дизлайков, если он там есть
      game.dislikes = game.dislikes.filter(id => !id.equals(userId));

      // Проверяем, есть ли уже лайк от этого пользователя
      if (game.likes.some(id => id.equals(userId))) {
          game.likes = game.likes.filter(id => !id.equals(userId));
      } else {
          game.likes.push(userId);
      }

      await game.save();
      res.json({
          success: true,
          likes: game.likes.length,
          dislikes: game.dislikes.length
      });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
};

// Дизлайк
exports.toggleDislike = async (req, res) => {
  try {
      const { path } = req.params;
      const userId = req.user.userId;

      const game = await Game.findOne({ path });
      if (!game) {
          return res.status(404).json({ success: false, message: 'Игра не найдена' });
      }

      // Удаляем пользователя из лайков, если он там есть
      game.likes = game.likes.filter(id => !id.equals(userId));

      // Проверяем, есть ли уже дизлайк от этого пользователя
      if (game.dislikes.some(id => id.equals(userId))) {
          game.dislikes = game.dislikes.filter(id => !id.equals(userId));
      } else {
          game.dislikes.push(userId);
      }

      await game.save();
      res.json({
          success: true,
          likes: game.likes.length,
          dislikes: game.dislikes.length
      });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
};


// Получить информацию о пользователе
exports.getUserProfile = async (req, res) => {
  try {
    // `authMiddleware` уже добавил `req.user.userId`
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};