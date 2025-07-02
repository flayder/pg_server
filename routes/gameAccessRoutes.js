const express = require('express');
const { checkGameAccess } = require('../controllers/gameAccessController');
const router = express.Router();

// Маршрут для проверки доступа к игре
router.get('/game-access', checkGameAccess);

module.exports = router;