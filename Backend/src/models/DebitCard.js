const mongoose = require('mongoose');

const debitCardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    cardName: {
      type: String,
      required: true,
      trim: true
    },
    cardNumber: {
      type: String,
      required: true,
      trim: true
    },
    linkedBankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DebitCard', debitCardSchema);
