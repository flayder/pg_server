const mongoose = require('mongoose');
const onlyActivePlugin = require('../plugins/onlyActivePlugin');

// Схема игры
const gameSchema = new mongoose.Schema({
  title: { type: String, required: true }, 
  description: { type: String }, 
  tags: [{ 
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }, 
    name: { type: String }
  }],
  images: { type: Array },
  demoPath: { type: String },
  fullPath: { type: String },
  image: { type: String }, 
  path: { type: String, required: true }, 
  active: { type: Boolean, default: false }, 
  views: { type: Number, default: 0 }, 
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  date: { 
    type: String, 
    default: () => new Date().toISOString().split('T')[0]
  }
});

//gameSchema.plugin(onlyActivePlugin);

module.exports = mongoose.model('Game', gameSchema);
