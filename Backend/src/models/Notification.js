const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['budget', 'goal', 'transaction', 'system'], default: 'system' },
  isRead: { type: Boolean, default: false },
  icon: { type: String, default: '🔔' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
