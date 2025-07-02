const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^[a-zA-Z0-9-_!?#@$%^&*()]{1,32}$/;
const nicknameRegex = /^[a-zA-Z]{1,10}$/;
const birthdateRegex = /^\d{4}-\d{2}-\d{2}$/;
const codeRegex = /^[0-9]{6}$/;

// Проверка, является ли строка корректной датой
function isValidDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime()); // Проверка, что дата валидная
}

// Middleware для проверки данных при авторизации (email и пароль)
function validateLogin(req, res, next) {
  const { email, password } = req.body;

  // Проверка наличия email и пароля в запросе
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Проверка email с помощью регулярного выражения
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Email is not correct' });
  }

  // Проверка пароля
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: 'The password must be no longer than 8 characters and contain only letters and numbers, -, _, !, ?, #' });
  }

  // Если все проверки пройдены, продолжаем
  next();
}

// Middleware для проверки данных при регистрации (email, пароль, login, nickname и дата рождения)
function validateRegistration(req, res, next) {
  const { email, password, nickname, birthdate } = req.body;

  // Проверка email с помощью регулярного выражения
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Email is not correct' });
  }

  // Проверка пароля
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: 'The password must be no longer than 8 characters and contain only letters and numbers, -, _, !, ?, #' });
  }

  // Проверка nickname
  if (!nicknameRegex.test(nickname)) {
    return res.status(400).json({ message: 'The nickname must contain only letters and be no longer than 10 characters.' });
  }

  // Проверка формата даты рождения (YYYY-MM-DD)
  if (!birthdateRegex.test(birthdate)) {
    return res.status(400).json({ message: 'Birthday format is YYYY-MM-DD.' });
  }

  // Проверка, является ли дата валидной
  if (!isValidDate(birthdate)) {
    return res.status(400).json({ message: 'Birthday is not correct' });
  }

  // Проверка, что дата не является будущей
  const birthdateObj = new Date(birthdate);
  if (birthdateObj > new Date()) {
    return res.status(400).json({ message: 'Birthday can`t be in the future' });
  }

  // Если все проверки пройдены, продолжаем
  next();
}

// Проверка кода
function validateConfirmationCode(req, res, next) {
  const { confirmationCode } = req.params;

  // Проверка наличия кода подтверждения
  if (!confirmationCode) {
    return res.status(400).json({ message: 'The confirmation code is reqiured' });
  }

  // Проверка кода подтверждения с использованием регулярного выражения
  if (!codeRegex.test(confirmationCode)) {
    return res.status(400).json({ message: 'The confirmation code should contain 6 numbers' });
  }

  // Если все проверки пройдены, продолжаем
  next();
}

async function verifyHcaptcha(hcaptchaResponse) {
    const secretKey = process.env.HCAPTCHA_SECRET_KEY; // Replace with your actual secret key

    const verificationUrl = 'https://api.hcaptcha.com/siteverify';
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', hcaptchaResponse);

    try {
        const response = await fetch(verificationUrl, {
            method: 'POST',
            body: params
        });
        const data = await response.json();
        //console.error('Data verifying hCaptcha:', [secretKey, data]);
        return data.success; // true if successful, false otherwise
    } catch (error) {
        console.error('Error verifying hCaptcha:', error);
        return false; // Handle errors gracefully
    }
}

// Экспортируем функции через module.exports
module.exports = {
  validateLogin,
  validateRegistration,
  validateConfirmationCode,
  verifyHcaptcha
};