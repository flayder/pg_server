const express = require("express");
const router = express.Router();
const metrica = require("../controllers/metricaController");
const multer = require('multer');
const upload = multer();

// Маршрут для манипуляцией метрик на сайте
router.post("/", upload.none(), metrica.handleMetrica);
router.get('/', metrica.getMetrica);

module.exports = router;
