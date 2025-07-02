//const jwt = require('jsonwebtoken');
//const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process'); // Для запуска команды unrar через exec
const { v4: uuidv4 } = require('uuid');
const Game = require('../models/Game');
const Tag = require('../models/Tag');

// Функция для преобразования title в URL-friendly path
const generateGamePath = (title) => {
  return title
    .toLowerCase()
    .replace(/['"]/g, '')            
    .replace(/[^a-z0-9]+/g, '-')      
    .replace(/^-+|-+$/g, '');         
};

exports.uploadGame = async (req, res) => {
  try {
    const { title, description, tags } = req.body;

    if (!req.files || !req.files.demoFile || !req.files.fullFile || !req.files.preview) {
      return res.status(400).json({ message: 'Необходимо загрузить превью, демо и полную версию игры' });
    }

    const demoFile = req.files.demoFile[0];
    const fullFile = req.files.fullFile[0];
    const previewImage = req.files.preview[0];
    const images = req.files.images;

    // Создание slug для path
    const gameSlug = generateGamePath(title);

    // Создаем уникальные папки для хранения файлов
    const demoUID = uuidv4(); // Генерируем UID для папки демо
    const fullUID = uuidv4(); // Генерируем UID для полной версии

    const demoFolderPath = path.resolve(__dirname, `../public/games/demo/${demoUID}`);
    const fullFolderPath = path.resolve(__dirname, `../public/games/full/${fullUID}`);

    fs.mkdirSync(demoFolderPath, { recursive: true });
    fs.mkdirSync(fullFolderPath, { recursive: true });

    // Обработка тегов перед сохранением
    let parsedTags;
    try {
      parsedTags = JSON.parse(tags); // tags приходит как JSON-строка
      if (!Array.isArray(parsedTags)) throw new Error("Invalid tags format");
    } catch (err) {
      console.error("Ошибка парсинга тегов:", err);
      return res.status(400).json({ message: "Ошибка формата тегов", error: err.message });
    }

    // Проверяем, что все теги существуют и получаем их `name`
    const tagsWithNames = await Tag.find({ _id: { $in: parsedTags } }).select('_id name');

    if (tagsWithNames.length !== parsedTags.length) {
      return res.status(400).json({ message: "Некоторые теги не найдены в базе" });
    }

    // Подготовим массив тегов в нужном формате
    const formattedTags = tagsWithNames.map(tag => ({
      _id: tag._id,
      name: tag.name
    }));

    // **Распаковка файлов**
    const extractFile = (filePath, targetPath) => {
      return new Promise((resolve, reject) => {
        const command = `unrar x '${filePath}' '${targetPath}'`;
        exec(command, (err, stdout, stderr) => {
          if (err) reject(`Ошибка при распаковке файла ${filePath}: ${stderr}`);
          else resolve();
        });
      });
    };

    try {
      await Promise.all([
        extractFile(demoFile.path, demoFolderPath),
        extractFile(fullFile.path, fullFolderPath)
      ]);
    } catch (extractError) {
      return res.status(500).json({ message: extractError });
    }
    const dbImages = []
    if(Array.isArray(images) && images?.length > 0) {
      for(file of images) {
        dbImages.push(`/api/images/${file.filename}`)
      }
    }

    // **Создание объекта игры**
    const newGame = new Game({
      title,
      description,
      tags: formattedTags, // Теперь теги содержат `_id` и `name`
      image: `/api/previews/${previewImage.filename}`,
      images: dbImages,
      demoPath: `/api/games/demo/${demoUID}/index.html`, // UID для демо
      path: `${gameSlug}`, // Путь для игры
      fullPath: `/api/games/full/${fullUID}/index.html`, // UID для полной версии
      active: false,
      views: 0,
      likes: [],
      dislikes: []
    });

    // **Сохранение в базе**
    await newGame.save();

    await Promise.all(
      formattedTags.map(async (tag) => {
        await Tag.findByIdAndUpdate(tag._id, { $push: { games: newGame._id } });
      })
    );
    
    res.status(200).json({ message: 'Игра успешно загружена и сохранена', game: newGame });

  } catch (error) {
    console.error('Ошибка при загрузке игры:', error);
    if (!res.headersSent) {
      console.log(error);
      res.status(500).json({ message: 'Ошибка при загрузке игры', error });
    }
  }
};

//Добавление тега
exports.addTag = async (req, res) => {
  try {
    const { name } = req.body;  // Получаем имя нового тега из запроса

    // Проверяем, существует ли уже такой тег
    const existingTag = await Tag.findOne({ name });
    if (existingTag) {
      return res.status(400).json({ message: 'Такой тег уже существует' });
    }

    // Создаем новый тег
    const newTag = new Tag({ name });
    await newTag.save();

    res.status(201).json({ message: 'Тег успешно создан', tag: newTag });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании тега', error });
  }
};

//Удаление тега
exports.deleteTag = async (req, res) => {
  try {
    const { tagId } = req.params; // Получаем ID тега из URL

    // Проверяем, существует ли тег
    const tag = await Tag.findById(tagId);
    if (!tag) {
      return res.status(404).json({ message: "Тег не найден" });
    }

    // Удаляем тег
    await Tag.findByIdAndDelete(tagId);

    res.status(200).json({ message: "Тег успешно удалён" });
  } catch (error) {
    res.status(500).json({ message: "Ошибка при удалении тега", error });
  }
};

//Изменение тега
exports.updateTag = async (req, res) => {
  try {
    const { tagId } = req.params; // Получаем ID тега из URL
    const { name } = req.body; // Получаем новое имя тега

    // Проверяем, существует ли тег
    const tag = await Tag.findById(tagId);
    if (!tag) {
      return res.status(404).json({ message: "Тег не найден" });
    }

    // Проверяем, не существует ли уже тег с таким именем
    const existingTag = await Tag.findOne({ name });
    if (existingTag && existingTag._id.toString() !== tagId) {
      return res.status(400).json({ message: "Тег с таким именем уже существует" });
    }

    // Обновляем имя тега
    tag.name = name;
    await tag.save();

    res.status(200).json({ message: "Тег успешно обновлён", tag });
  } catch (error) {
    res.status(500).json({ message: "Ошибка при обновлении тега", error });
  }
};

exports.updateGame = async (req, res) => {
  try {
    const { id, title, description, date, active } = req.body; // ✨ добавляем active сюда

    if (!id) {
      return res.status(400).json({ message: "Game ID is required" });
    }
    console.log('id', id);
    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Обновляем поля
    game.date = date || game.date;
    game.title = title || game.title;
    game.description = description || game.description;

    // ВАЖНО: приведение строки в булев тип, если оно приходит как строка
    if (typeof active !== 'undefined') {
      game.active = active === 'true' || active === true;
    }

    const images = req.files?.images;
    console.log('images', images);

    if(Array.isArray(images) && images?.length > 0) {
      const dbImages = [];
      for(file of images) {
        dbImages.push(`/api/images/${file.filename}`);
      }
      game.images = dbImages;
      console.log('sssss', game);
    }

    // Обновление демо-версии
    if (req.files?.demoFile?.[0]) {
      const demoUID = uuidv4();
      const demoFolderPath = path.resolve(__dirname, `../public/games/demo/${demoUID}`);
      fs.mkdirSync(demoFolderPath, { recursive: true });

      const demoFile = req.files.demoFile[0];
      await extractFile(demoFile.path, demoFolderPath);
      game.demoPath = `/api/games/demo/${demoUID}/index.html`;
    }

    // Обновление полной версии
    if (req.files?.fullFile?.[0]) {
      const fullUID = uuidv4();
      const fullFolderPath = path.resolve(__dirname, `../public/games/full/${fullUID}`);
      fs.mkdirSync(fullFolderPath, { recursive: true });

      const fullFile = req.files.fullFile[0];
      await extractFile(fullFile.path, fullFolderPath);
      game.fullPath = `/api/games/full/${fullUID}/index.html`;
    }

    await game.save();

    res.status(200).json({ message: "Игра успешно обновлена", game });

  } catch (error) {
    console.error("Ошибка при обновлении игры:", error);
    res.status(500).json({ message: "Ошибка при обновлении игры", error });
  }
};


// Вспомогательная функция распаковки
const extractFile = (filePath, targetPath) => {
  return new Promise((resolve, reject) => {
    const command = `unrar x '${filePath}' '${targetPath}'`;
    exec(command, (err, stdout, stderr) => {
      if (err) reject(`Ошибка распаковки ${filePath}: ${stderr}`);
      else resolve();
    });
  });
};