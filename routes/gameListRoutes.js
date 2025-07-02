const express = require('express');
const router = express.Router();
const { sendContactMessage, searchGames, getUserProfile, getRandomGame, getGameById, getGameList, getTags, getGamesByTags, toggleLike, toggleDislike } = require('../controllers/gameListController');
const authenticateToken = require('../middlewares/authMiddleware');

//Получить список игр
router.get('/get-games', getGameList);

//Поиск игр через поиск
router.get('/search', searchGames);

//Получение тегов
router.get('/tags', getTags);

// Маршрут для получения списка игр по тегам
router.get('/games-by-tags', getGamesByTags);

// Маршрут для получения игры по её ID
router.get('/game/:gameName', getGameById);

// Маршрут для получения случайной игры
router.get('/random', getRandomGame);

router.post('/send', sendContactMessage);

// Маршруты для лайков и дизлайков (защищенные)
router.post('/like/:path', authenticateToken, toggleLike);

router.post('/dislike/:path', authenticateToken, toggleDislike);

router.get('/profile', authenticateToken, getUserProfile);

module.exports = router;