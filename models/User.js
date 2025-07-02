const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Схема пользователя
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nickname: { type: String, required: true },
  birthdate: { type: Date, required: false },
  subscriptionStatus: { type: String, default: 'unbill' },
  role: {type: String, default: 'user'},
  isActive: { type: Boolean, default: false },  // Пользователь активен или нет
  confirmationCode: { type: String },  // Код подтверждения
  confirmationExpires: { type: Date },  // Срок действия кода подтверждения
  resetPasswordToken: { type: String },  // Токен для сброса пароля
  resetPasswordExpires: { type: Date }, // Срок действия токена для сброса пароля
  confirmationCodeSession: { type: String },  // Код подтверждения
  confirmationExpiresSession: { type: Date }, // Срок действия токена для подтверждения сессии
   // Хранение активных сессий (максимум 3)
   sessions: [
    {
      token: { type: String },  // JWT токен
      createdAt: { type: Date, default: Date.now }  // Время создания сессии
    }
  ],
  // Дата окончания подписки
  subscriptionExpires: { type: Date },
  flexId: { type: String },
  priceDescription: { type: String },
  subscriptionId: { type: String },
  accountingInitialPrice: { type: String }
});

// Хеширование пароля перед сохранением
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);