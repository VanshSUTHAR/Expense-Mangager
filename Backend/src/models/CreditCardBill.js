const mongoose = require('mongoose');
 
const creditCardBillSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    cardKey: {
      type: String,
      required: true,
      index: true
    },
    cardName: {
      type: String,
      required: true,
      trim: true
    },
    cardNumber: {
      type: String,
      default: ''
    },
    transactions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    }],
    totalAmount: {
      type: Number,
      required: true
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    transactionCount: {
      type: Number,
      default: 0
    },
    statementDate: {
      type: Date,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Overdue', 'EMI'],
      default: 'Pending'
    },
    paidAt: {
      type: Date,
      default: null
    },
    settlementType: {
      type: String,
      enum: ['full', 'emi'],
      default: 'full'
    },
    emiMonths: {
      type: Number,
      default: 0
    },
    emiAmount: {
      type: Number,
      default: 0
    },
    emiSchedule: [{
      installmentNumber: Number,
      dueDate: Date,
      amount: Number,
      status: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
      },
      paidAt: {
        type: Date,
        default: null
      }
    }],
    description: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);
 
module.exports = mongoose.model('CreditCardBill', creditCardBillSchema);