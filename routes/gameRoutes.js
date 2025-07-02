const express = require('express');
const multer = require('multer'); // Для обработки загрузки файлов
const authenticateToken = require('../middlewares/authMiddleware');
const checkAdminRole = require('../middlewares/checkAdminRole');
const deployController = require("../controllers/deployController");
const { updateTag, deleteTag, addTag, uploadGame, updateGame } = require('../controllers/gameController');
const router = express.Router();
const fileUpload = require("express-fileupload");

const sanitizeFileName = (name) => {
  return name
    .normalize('NFKD')             
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_');
};

//router.use(fileUpload());

//Добавление нового тега 
router.post('/addtag', authenticateToken, checkAdminRole, addTag);

//Удаление тега
router.delete("/deletetag/:tagId", authenticateToken, checkAdminRole, deleteTag);

//Изменение тега
router.put("/tags/:tagId", authenticateToken, checkAdminRole, updateTag);

// Настраиваем multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'demoFile') {
      cb(null, 'uploads/games/demo/');
    } else if (file.fieldname === 'fullFile') {
      cb(null, 'uploads/games/full/');
    } else if (file.fieldname === 'preview') {
      cb(null, 'uploads/previews/');
    } else if(file.fieldname === 'images') {
      cb(null, 'uploads/images/');
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + sanitizeFileName(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Маршрут для загрузки игры (демо и полной версии)
router.post(
  '/upload',
  authenticateToken, // Проверка аутентификации
  checkAdminRole, // Проверка прав администратора
  upload.fields([{ name: 'demoFile', maxCount: 1 }, { name: 'fullFile', maxCount: 1 }, { name: 'preview', maxCount: 1 }, { name: 'images', maxCount: 10 }]),
  uploadGame
);

// Новый маршрут для редактирования игры
router.put(
  '/update-game',
  authenticateToken,
  checkAdminRole,
  upload.fields([{ name: 'demoFile', maxCount: 1 }, { name: 'fullFile', maxCount: 1 }, { name: 'preview', maxCount: 1 }, { name: 'images', maxCount: 10 }]),
  updateGame
);

router.post("/clear-output", authenticateToken, checkAdminRole, deployController.clearOutput);
router.post("/upload-frontend", authenticateToken, checkAdminRole, deployController.uploadFrontend);
router.post("/restart-frontend", authenticateToken, checkAdminRole, deployController.restartFrontend);

module.exports = router;