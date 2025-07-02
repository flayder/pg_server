const ipFilter = require('ip-range-check');

const allowedIPs = [
    '64.38.240.0/24',
    '64.38.241.0/24',
    '64.38.212.0/24',
    '64.38.215.0/24'
];

module.exports = (req, res, next) => {
    // Если используется прокси, используем x-forwarded-for, иначе - обычный remoteAddress
    let ip = req.headers['x-real-ip'];
    
    // Проверяем, что IP в списке разрешенных
    if (ipFilter(ip, allowedIPs)) {
        next(); // Разрешаем запрос
    } else {
        res.status(403).send('Access denied: Invalid IP address'); // Отказываем в доступе
    }
};
