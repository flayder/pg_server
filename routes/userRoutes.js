const express = require('express');
const { deleteUser, clearUserSessions, getAllUsers, getUserById, updateUserById } = require('../controllers/userController');  // Подключаем контроллер пользователей
const authenticateToken = require('../middlewares/authMiddleware');
const checkAdminRole = require('../middlewares/checkAdminRole');
const router = express.Router();

// Маршрут для получения всех пользователей
router.get('/get-all-users', authenticateToken, checkAdminRole, getAllUsers);

// Получение информации о пользователе (доступно только администратору)
router.get('/user/:userId', authenticateToken, checkAdminRole, getUserById);

// Обновление информации о пользователе (кроме пароля)
router.put('/user/:userId', authenticateToken, checkAdminRole, updateUserById);

// Маршрут для очистки сессий по email (только админы или сам пользователь могут очищать свои сессии)
router.put('/clear-sessions', authenticateToken, checkAdminRole, clearUserSessions);

router.delete('/:userId', authenticateToken, checkAdminRole, deleteUser);

module.exports = router;