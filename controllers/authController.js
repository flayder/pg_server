const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { transporter } = require('../global/func/transporter');
const { verifyHcaptcha } = require('../middlewares/validators');

exports.checkAuthStatus = (req, res) => {
    const token = req.cookies?.token; // Имя куки с токеном

    if (!token) {
        return res.status(401).json({ message: "Не авторизован" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Проверяем токен
        return res.status(200).json({ userId: decoded.userId, message: "Авторизован" });
    } catch (error) {
        return res.status(401).json({ message: "Недействительный токен" });
    }
};

// Регистрация
exports.register = async (req, res) => {
  const { birthdate, email, nickname, password, captcha } = req.body;

  // 🔐 Проверка наличия капчи
  if (!captcha) {
    return res.status(400).json({ message: "Captcha is required" });
  }

  try {
    // 🔐 Проверка токена hCaptcha
    var captchaCheck = await verifyHcaptcha(captcha);

    if(!captchaCheck) {
     return res.status(400).json({ message: "Captcha is not correct" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Проверка, существует ли пользователь с таким email
    const existingUserByEmail = await User.findOne({ email: normalizedEmail });
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    // Проверка, существует ли пользователь с таким никнеймом
    const existingUserByNickname = await User.findOne({ nickname });
    if (existingUserByNickname) {
      return res.status(400).json({ message: 'A user with this nickname already exists.' });
    }

    // Генерация 6-значного кода
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({
      email: normalizedEmail,
      password,
      nickname,
      birthdate,
      isActive: false,
      confirmationCode,
      confirmationExpires: Date.now() + 5 * 60 * 1000, // 5 минут
      sessions: [],
    });

    await newUser.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Confirmation of registration',
      text: `Your confirmation code: ${confirmationCode}`
    };

    await transporter().sendMail(mailOptions);

    res.status(201).json({
      message: 'The user has been successfully registered. Check the email for confirmation.'
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: 'Server error during registration', error });
  }
};

exports.login = async (req, res) => {
  const { email, password, captcha } = req.body;

  // Проверка капчи
  if (!captcha) {
    return res.status(400).json({ message: "Captcha is required" });
  }

  try {
    var captchaCheck = await verifyHcaptcha(captcha);

    if(!captchaCheck) {
     return res.status(400).json({ message: "Captcha is not correct" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        message: 'Your account is inactive. Please confirm your account here - https://porngamestown.com/confirm</a>.' 
      });      
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    
    // Проверка активных сессий
    if (user.role != 'admin' && user.sessions.length >= 3) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.confirmationCodeSession = code;
      user.confirmationExpiresSession = Date.now() + 5 * 60 * 1000; // 5 минут
      await user.save();

      // Отправка письма
      await transporter().sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Confirming a new session",
        text: `Your confirmation code: ${code}.`,
      });

      return res.status(403).json({ message: "Max 3 sessions. Please confirm your session." });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Ставим токен в куки
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Добавляем токен в сессии
    user.sessions.push({ token });
    if (user.sessions.length > 3) user.sessions.shift();

    await user.save();

    res.json({ message: "Login successful", token });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Authorization error", error });
  }
};

// Подтверждение через код
exports.confirmSession = async (req, res) => {
  const { code } = req.params; // Получаем код из параметров маршрута

  try {
    // Ищем пользователя по коду подтверждения
    const user = await User.findOne({
      confirmationCodeSession: code,
      //confirmationExpiresSession: { $gt: Date.now() }  // Убедимся, что код ещё действителен
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired confirmation code.' });
    }

    // Генерация нового JWT токена
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Удаляем самую старую сессию, если их больше 3
    if (user.sessions.length >= 3) {
      user.sessions.shift();  // Удаляем самую старую сессию
    }

    // Добавляем новую сессию с токеном
    user.sessions.push({ token });

    // Очищаем код подтверждения и срок действия кода
    user.confirmationCodeSession = undefined;
    user.confirmationExpiresSession = undefined;

    // Сохраняем обновлённые данные пользователя
    await user.save();

    // Устанавливаем токен в HTTP-only куку
    res.cookie('token', token, {
      httpOnly: true, // Защита от XSS
      secure: true, // Только HTTPS в продакшене
      sameSite: "None", // Разрешает работу между разными доменами
      //domain: ".porngamestown.com", // Домен для работы кук
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    });

    res.status(200).json({ message: 'Session confirmed successfully', token });

  } catch (error) {
    res.status(500).json({ message: 'Session confirmation error', error });
  }
};

// Повторная отправка кода подтверждения сессии
exports.resendConfirmationCodeSession = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'The user with this email was not found.' });
    }

    // Проверяем, не истек ли код подтверждения
    if (user.confirmationExpiresSession && user.confirmationExpiresSession > Date.now()) {
      return res.status(400).json({ message: 'The confirmation code is still valid. Please check your email.' });
    }

    // Генерация нового кода подтверждения - 6 знаков
    const newConfirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.confirmationCodeSession = newConfirmationCode;
    user.confirmationExpiresSession = Date.now() + 3000000; // 1 час

    await user.save();

    // Отправка нового кода подтверждения на email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Resending the confirmation code for a new session',
      text: `Your new confirmation code: ${newConfirmationCode}`
    };

    await transporter().sendMail(mailOptions);

    res.status(200).json({ message: 'A new confirmation code has been sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Error when resending the code', error });
  }
};

// Подтверждение email регистрация
exports.confirmEmail = async (req, res) => {
  try {
    const user = await User.findOne({
      confirmationCode: req.params.code,
      confirmationExpires: { $gt: Date.now() }  // Проверяем, что код еще не истек
    });

    if (!user) {
      return res.status(400).json({ message: 'The confirmation code is invalid or expired' });
    }

    user.isActive = true;  // Активируем пользователя
    user.confirmationCode = undefined;  // Убираем код подтверждения
    user.confirmationExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'Your account has been successfully activated!' });
  } catch (error) {
    res.status(500).json({ message: 'Account confirmation error', error });
  }
};

//Повторная отправка кода подтверждения
exports.resendConfirmationCode = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user || user.isActive) {
      return res.status(400).json({ message: 'The user has not been found or has already been activated' });
    }

    // Генерируем новый код подтверждения
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.confirmationCode = confirmationCode;
    user.confirmationExpires = Date.now() + 300000;  // 1 час на подтверждение

    await user.save();

    // Отправляем новый код на email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Resending the confirmation code',
      text: `Your new confirmation code: ${confirmationCode}\n\n`
    };

    await transporter().sendMail(mailOptions);

    res.status(200).json({ message: 'A new confirmation code has been sent by email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error when resending the code', error });
  }
};

// Сброс пароля
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  console.log([token, password]);
  
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      //resetPasswordExpires: { $gt: Date.now() }  // Проверяем, что токен еще действителен
    });

    if (!user) {
      return res.status(400).json({ message: 'The reset token is invalid or expired' });
    }

    // Получаем новый пароль и сохраняем
    user.password = password;
    user.resetPasswordToken = undefined;  // Убираем токен после сброса
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'The password has been successfully reset. You can now log in with a new password.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error when resetting password', error });
  }
};

// Запрос на восстановление пароля
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'The user with this email was not found.' });
    }

    // Генерация токена для сброса пароля
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 300000;  // Токен действителен 5 min

    await user.save();

    // Отправляем email с ссылкой для сброса пароля
    const resetUrl = resetToken;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Recovery',
      text: `You have requested password recovery. Reset your password: ${resetUrl}`
    };

    await transporter().sendMail(mailOptions);

    res.status(200).json({ message: 'The password reset code has been sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error when sending a password recovery code', error });
  }
};

//Повторный запрос на восстановление пароля
exports.resendResetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'The user with this email was not found.' });
    }

    // Проверяем, есть ли уже действующий токен сброса пароля
    if (user.resetPasswordToken && user.resetPasswordExpires > Date.now()) {
      // Если токен существует и ещё действителен, повторно отправляем его
      const resetUrl = user.resetPasswordToken;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Resending the password recovery code',
        text: `You have requested to resend the password recovery code. Reset your password: ${resetUrl}`
      };

      await transporter().sendMail(mailOptions);
      return res.status(200).json({ message: 'The password recovery link has been re-sent to your email' });
    }

    // Если токена нет или он истёк, создаем новый
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 300000;  // Токен действителен 1 час

    await user.save();

    // Отправляем новый email с ссылкой для сброса пароля
    const resetUrl = resetToken;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Recovery',
      text: `You have requested password recovery. Reset your password: ${resetUrl}`
    };

    await transporter().sendMail(mailOptions);

    res.status(200).json({ message: 'The password recovery code has been re-sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error when sending a password recovery code', error });
  }
};

// Выход из аккаунта
exports.logout = async (req, res) => {
  try {
    // Проверяем, есть ли кука с токеном
    if (!req.cookies.token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Получаем токен из куки
    const token = req.cookies.token;

    // `req.user` уже установлен в `authMiddleware`
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(400).json({ message: 'The user was not found' });
    }

    // Удаляем текущую сессию из массива `sessions`
    user.sessions = user.sessions.filter(session => session.token !== token);

    // Сохраняем обновления в БД
    await user.save();

    // Удаляем токен из куки
    res.clearCookie("token", {
      httpOnly: true, // Защита от XSS
      secure: true, // Только HTTPS в продакшене
      path: "/",
      sameSite: "None", // Разрешает работу между разными доменами
    });

    res.status(200).json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error when logging out of the account', error });
  }
};