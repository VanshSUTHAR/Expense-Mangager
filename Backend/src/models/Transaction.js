const mongoose = require('mongoose');



const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    category: {
      type: String,
      required: true
    },

    description: {
      type: String,
      trim: true,
      default: ''
    },

    date: {
      type: Date,
      default: Date.now
    },

    time: {
      type: String,
      default: ''
    },

    paymentMethod: {
      type: String,
      default: ''
    },

    bankName: {
      type: String,
      default: ''
    },

    accountNumber: {
      type: String,
      default: ''
    },

    tags: [{ type: String }],

    isRecurring: {
      type: Boolean,
      default: false
    },

    recurringFrequency: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);