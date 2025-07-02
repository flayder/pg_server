const express = require('express');
const { validateConfirmationCode, validateLogin, validateRegistration } = require('../middlewares/validators');
const { resendResetPassword, checkAuthStatus, logout, resendConfirmationCodeSession, confirmSession, forgotPassword, resetPassword, confirmEmail, register, login, resendConfirmationCode } = require('../controllers/authController');
const authenticateToken = require('../middlewares/authMiddleware');
const checkAdminRole = require('../middlewares/checkAdminRole');
const router = express.Router();
// validateConfirmationCode,
// Маршрут для подтверждения email по коду для регистрации
router.get('/confirm/:code', confirmEmail);
router.post('/resend-confirmation', resendConfirmationCode);

//Авторизация
router.post('/login', validateLogin, login); // Маршрут для логина

//Регистрация
router.post('/register', validateRegistration, register); // Маршрут для регистрации

//Подтверждение сессии
router.get('/confirm-session/:code', confirmSession);//Маршрут для подтверждения сессии
router.post('/resend-confirmation-session', resendConfirmationCodeSession); //Маршрут повторной отправки кода сессии

// Восстановление пароля
router.post('/forgot-password', forgotPassword);  // Запрос на восстановление пароля
router.post('/reset/:token', resetPassword);  // Сброс пароля
router.post('/resend-reset-password', resendResetPassword); // Маршрут для повторной отправки ссылки восстановления пароля

//Выход из аккаунта
router.post('/logout', authenticateToken, logout);

//
router.get('/status', checkAuthStatus)

module.exports = router;