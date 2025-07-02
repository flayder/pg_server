const User = require('../models/User');  // Импорт модели пользователя
const Metrica = require('../models/Metrica');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { transporter } = require('../global/func/transporter');

exports.handlePaymentNotification = async (req, res) => {
    try {
        console.log("Получено уведомление об оплате:", req.body);

        const { email, initialPeriod, flexId, subscriptionId, priceDescription, accountingInitialPrice, reason, billedInitialPrice } = req.body;

        // Поиск пользователя по email
        let user = await User.findOne({ email });

        if (reason) {
            // Если присутствует ключ "reason", очищаем поля подписки
            if (user) {
                user.flexId = null;
                user.subscriptionId = null;
                user.priceDescription = null;
                user.accountingInitialPrice = null;
                await user.save();
                console.log(`Подписка отменена и данные очищены для пользователя ${email}`);
            }
        } else {
            // Генерируем дату окончания подписки: текущая дата + initialPeriod дней
            const subscriptionExpires = new Date();
            subscriptionExpires.setDate(subscriptionExpires.getDate() + parseInt(initialPeriod));

            if (user) {
                // Пользователь найден: обновляем подписку
                user.subscriptionStatus = 'bill';
                user.subscriptionExpires = subscriptionExpires;
                user.flexId = flexId;
                user.subscriptionId = subscriptionId;
                user.priceDescription = priceDescription;
                user.accountingInitialPrice = accountingInitialPrice;
                await user.save();
                console.log(`Подписка обновлена для пользователя ${email}`);
            } else {
                // Пользователь не найден: регистрируем нового
                const password = generateRandomPassword(12); // Генерация пароля
                const nickname = `user_${crypto.randomBytes(4).toString('hex')}`; // Генерация никнейма

                user = new User({
                    email,
                    password,
                    nickname,
                    birthdate: new Date('2000-01-01'), // Фиксированная дата
                    subscriptionStatus: 'bill',
                    subscriptionExpires,
                    role: 'user',
                    isActive: true,
                    flexId,
                    subscriptionId,
                    priceDescription,
                    accountingInitialPrice
                });

                await user.save();
                console.log(`Новый пользователь зарегистрирован: ${email}`);
                await sendRegistrationEmail(email, password, nickname); // Отправка письма с данными
            }
        }

        await Metrica.create({
            event: 'success_payment',
            value: `${email}${billedInitialPrice ? '(Цена: ' + billedInitialPrice + ')': ''}`
        });

        res.status(200).json({ message: "Уведомление обработано успешно" });
    } catch (error) {
        console.error("Ошибка при обработке уведомления:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// Генерация случайного пароля
function generateRandomPassword(length) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    return Array.from(crypto.randomFillSync(new Uint8Array(length)))
        .map(byte => charset[byte % charset.length])
        .join('');
}

// Отправка письма с логином и паролем
async function sendRegistrationEmail(email, password, nickname) {
    const mailOptions = {
        from: 'postmaster@porngamestown.com',
        to: email,
        subject: 'Thank you for registering!',
        text: `Welcome to our site!\n\nYour login details:\nEmail: ${email}\nPassword: ${password}\nNickname: ${nickname}\n\nEnjoy your subscription!`
    };

    try {
        await transporter().sendMail(mailOptions);
        console.log(`Письмо с данными для входа отправлено на ${email}`);
    } catch (error) {
        console.error(`Ошибка при отправке письма: ${error}`);
    }
}