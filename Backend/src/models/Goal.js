const mongoose = require('mongoose');

// const goalSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   title: { type: String, required: true },
//   targetAmount: { type: Number, required: true },
//   currentAmount: { type: Number, default: 0 },
//   deadline: { type: Date, required: true },
//   category: { type: String, default: 'savings' },
//   icon: { type: String, default: '🎯' },
//   color: { type: String, default: '#6366f1' },
//   status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
//   notes: { type: String },
// }, { timestamps: true });

   const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  deadline: { type: Date, required: true },
  category: { type: String, default: 'savings' },

  // React Icon name store karva mate
  icon: { type: String, default: 'FaBullseye' },

  color: { type: String, default: '#6366f1' },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  notes: { type: String },
}, { timestamps: true });


goalSchema.virtual('progress').get(function () {
  return Math.min((this.currentAmount / this.targetAmount) * 100, 100).toFixed(1);
});

goalSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Goal', goalSchema);
