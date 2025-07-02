const Metrica = require('../models/Metrica');  // Импорт модели пользователя
const moment = require('moment');

exports.handleMetrica = async (req, res) => {
    try {
        //console.log('req.body', req.body);
        var { event, ip, value } = req.body;
        if(event) {
            if(!ip) ip = '';
            if(!value) value = '';

            await Metrica.create({
                event,
                ip,
                value
            });
        }

        res.status(200).json({ message: "Данные успешно получены" });
    } catch (error) {
        console.error("Ошибка при обработке данных:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

exports.getMetrica = async (req, res) => {
    var { period, fromDate, toDate, event } = req.query;

    if(!period)
        period = 'month';

    const filter = {};

    if(fromDate == '' && toDate == '') {
        if(period == 'month') {
            filter.date = {
                $gte: moment().subtract(1, 'month')
            };
        } else if(period == 'today') {
            filter.date = {
                $gte: moment().startOf('day')
            };
        } else if(period == 'year') {
            filter.date = {
                $gte: moment().startOf('year')
            };
        } else if(period == 'weak') {
            filter.date = {
                $gte: moment().subtract(7, 'days')
            };
        }
    } else {
        if(fromDate && toDate) {
            filter.date = {
                $gte: moment(fromDate).subtract(1, 'day'),
                $lte: moment(toDate).add(1, 'day')
            };
        } else if(fromDate && !toDate) {
            filter.date = {$gte: moment(fromDate).subtract(1, 'day')};
        } else if(!fromDate && toDate) {
            filter.date = {$lte: moment(toDate).add(1, 'day')};
        }
    }

    if(event) {
        filter.event = {
            $in: event.split(',')
        };
    }

    try {
        const response = await Metrica.find(filter);

        res.status(200).json(response);
    } catch(e) {
        console.log('Getting metrica error', e);
        res.status(200).json([]);
    }
};