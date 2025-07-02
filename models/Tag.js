const mongoose = require('mongoose');

// Схема для тегов
const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Tag', tagSchema);