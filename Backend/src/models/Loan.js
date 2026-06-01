const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String, enum: ['car', 'home', 'personal', 'education', 'other'], default: 'personal' },
  principalAmount: { type: Number, required: true },
  interestRate: { type: Number, required: true },
  tenureYears: { type: Number, required: true },
  customEMI: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  paidEMIs: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  bankName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);
