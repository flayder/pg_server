const express = require("express");
const router = express.Router();
const ipFilter = require('../middlewares/ipFilter');
const paymentNotificationController = require("../controllers/paymentNotificationController");

// Маршрут для приема уведомлений о платежах
router.post("/", ipFilter, paymentNotificationController.handlePaymentNotification);

module.exports = router;
