require('dotenv').config();  // Загружаем переменные окружения
const express = require('express');
const path = require('path');
const connectDB = require('./config/db');  // Подключаем файл с подключением к MongoDB
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();
const allowedOrigins = ["https://porngamestown.com", "https://admin.porngamestown.com", "http://127.0.0.1:3000", "http://localhost:3000", "http://127.0.0.1:3001", "http://localhost:3001"];
//const allowedOrigins = ["*"];

process.on('unhandledRejection', (reason, p) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());  // Парсинг JSON

app.use(cors({
  origin: function (origin, callback) {
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true // Обязательно для работы с куками
}));

app.use(cookieParser());
// app.use(require('./middleware/authMiddleware'));
// app.use('/api/games/full', (req, res, next) => {
//   const user = req.user;

//   if (!user || (user.subscription !== 'bill' && user.role !== 'admin')) {
//     return res.status(403).send('Access denied to full version');
//   }

//   next();
// });

function checkAuthCookie(req, res, next) {
  if (!req.cookies.token) {
    return res.status(403).send('Доступ запрещен. Требуется авторизация.');
  }
  
  next();
}

app.use('/api/games/full', checkAuthCookie, express.static('/var/www/porngamestown.com/server/public/games/full'));
app.use('/api/games/demo', express.static('/var/www/porngamestown.com/server/public/games/demo'));
app.use('/api/previews', express.static('/var/www/porngamestown.com/server/uploads/previews'));
app.use('/api/images', express.static('/var/www/porngamestown.com/server/uploads/images'));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin); // Указываем конкретный домен
    res.setHeader("Access-Control-Allow-Credentials", "true"); // Обязательно для кук
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Обрабатываем preflight-запросы
  if (req.method === "OPTIONS") {
    return res.sendStatus(204); // Отвечаем без тела
  }

  next();
});


// Подключение к MongoDB
connectDB();

// Старт cron задач
const startCronJobs = require('./tasks/cronFilterSession');
const checkSubscriptionStatus = require('./tasks/cronCheckSubscription');

startCronJobs();
checkSubscriptionStatus();

// Маршруты
const paymentNotificationRoutes = require("./routes/paymentNotificationRoutes");
const gameRoutes = require('./routes/gameRoutes');
const gameAccessRoutes = require('./routes/gameAccessRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const gameListRoutes = require('./routes/gameListRoutes');
const metricaRoutes = require('./routes/metricaRoutes');
const contactRoutes = require('./routes/contact');

//Маршрут для обработки метрик
app.use("/api/metrica", metricaRoutes);

//Маршрут проверки платежа и уведомлений от ПС
app.use("/api/payment-notifications", paymentNotificationRoutes);

//Маршруты авторизации
app.use('/api/auth', authRoutes);

//Маршруты для игр
app.use('/api/games', gameListRoutes);

//Маршруты работы с пользователями
app.use('/api/users', userRoutes);

// Админ Игры
app.use('/api/admin', gameRoutes);

// Другие маршруты...
app.use('/api', gameAccessRoutes);

app.use('/api/support', contactRoutes)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});