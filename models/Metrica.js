const mongoose = require('mongoose');

// Схема для метрики
const metricaSchema = new mongoose.Schema({
  event: { type: String, required: true },
  ip: { type: String },
  value: { 
    type: String,
    default: () => ''
  },
  date: { 
    type: Date, 
    default: () => new Date()
  }
});

module.exports = mongoose.model('Metrica', metricaSchema);