const Loan = require('../models/Loan');
const BankAccount = require('../models/BankAccount');
const DebitCard = require('../models/DebitCard');
const Transaction = require('../models/Transaction');

const calculateEMI = (principal, rate, years) => {
  const r = rate / 12 / 100;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

const getLoanEMI = (loan) => {
  const custom = Number(loan.customEMI) || 0;
  return custom > 0 ? custom : calculateEMI(loan.principalAmount, loan.interestRate, loan.tenureYears);
};

// Compute next EMI due date and status for a loan
const computeEMIStatus = (loan) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDay = loan.emiDueDay || 5;
  const lastPaid = loan.lastEMIPaidAt ? new Date(loan.lastEMIPaidAt) : null;

  const currentMonthPaid = lastPaid &&
    lastPaid.getMonth() === today.getMonth() &&
    lastPaid.getFullYear() === today.getFullYear();

  let nextDueDate;
  if (currentMonthPaid) {
    nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  } else {
    nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.floor((nextDueDate - today) / msPerDay);

  let status;
  if (currentMonthPaid) status = 'Paid';
  else if (daysRemaining < 0) status = 'Overdue';
  else if (daysRemaining === 0) status = 'Due Today';
  else status = 'Pending';

  return { nextDueDate, daysRemaining, status, currentMonthPaid };
};

// GET /api/loans
const getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/loans
const createLoan = async (req, res) => {
  try {
    const loan = await Loan.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/loans/:id
const updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/loans/:id
const deleteLoan = async (req, res) => {
  try {
    await Loan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Loan deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/loans/:id/pay-emi
const payEMI = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const totalEMIs = loan.tenureYears * 12;
    if (loan.paidEMIs >= totalEMIs) {
      return res.json({ success: true, message: 'Loan already completed' });
    }

    const emiAmount = Math.round(getLoanEMI(loan));
    const { bankAccountId, debitCardId } = req.body;

    // ── Balance validation (backend guard) ──
    let bankAccount = null;

    if (bankAccountId) {
      bankAccount = await BankAccount.findOne({ _id: bankAccountId, user: req.user._id });
      if (!bankAccount) {
        return res.status(404).json({ success: false, message: 'Bank account not found' });
      }
      if (emiAmount > bankAccount.balance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient Balance for this EMI payment. Your account contains only ₹${bankAccount.balance.toLocaleString('en-IN')}.`
        });
      }
    } else if (debitCardId) {
      const debitCard = await DebitCard.findOne({ _id: debitCardId, user: req.user._id })
        .populate('linkedBankAccount');
      if (!debitCard) {
        return res.status(404).json({ success: false, message: 'Debit card not found' });
      }
      bankAccount = debitCard.linkedBankAccount;
      if (emiAmount > bankAccount.balance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient Balance for this EMI payment. Your account contains only ₹${bankAccount.balance.toLocaleString('en-IN')}.`
        });
      }
    }

    // ── Update loan ──
    loan.paidEMIs += 1;
    loan.lastEMIPaidAt = new Date();
    if (loan.paidEMIs >= totalEMIs) loan.status = 'completed';
    await loan.save();

    // ── Deduct from bank account ──
    if (bankAccount) {
      await BankAccount.findByIdAndUpdate(bankAccount._id, { $inc: { balance: -emiAmount } });
    }

    // ── Record transaction ──
    if (bankAccount) {
      await Transaction.create({
        user: req.user._id,
        type: 'expense',
        amount: emiAmount,
        category: 'loan_emi',
        description: `EMI - ${loan.title}`,
        date: new Date(),
        paymentMethod: 'netbanking',
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        isLoanEMI: true,
        loanId: loan._id,
        loanTitle: loan.title,
      });
    }

    res.json({
      success: true,
      loan,
      paidFrom: bankAccount?.bankName || loan.bankName,
      remainingBalance: bankAccount ? bankAccount.balance - emiAmount : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/loans/upcoming-emis
const getUpcomingEMIs = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id, status: 'active' });

    const emis = loans.map((loan) => {
      const emiAmount = Math.round(getLoanEMI(loan));
      const { nextDueDate, daysRemaining, status } = computeEMIStatus(loan);

      return {
        loanId: loan._id,
        title: loan.title,
        category: loan.category,
        emiAmount,
        nextDueDate,
        daysRemaining,
        status,
        paidEMIs: loan.paidEMIs,
        totalEMIs: loan.tenureYears * 12,
      };
    });

    // Sort: Overdue first, then Due Today, then by days remaining ascending
    emis.sort((a, b) => {
      const order = { Overdue: 0, 'Due Today': 1, Pending: 2, Paid: 3 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return a.daysRemaining - b.daysRemaining;
    });

    res.json({ success: true, emis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/loans/:id/advance-payment
const advancePayment = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (loan.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Loan is already completed' });
    }

    const { amount, bankAccountId, debitCardId } = req.body;
    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Enter a valid advance amount' });
    }

    // ── Balance validation ──
    let bankAccount = null;
    if (bankAccountId) {
      bankAccount = await BankAccount.findOne({ _id: bankAccountId, user: req.user._id });
      if (!bankAccount) return res.status(404).json({ success: false, message: 'Bank account not found' });
      if (payAmount > bankAccount.balance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient Balance. Your account contains only ₹${bankAccount.balance.toLocaleString('en-IN')}.`
        });
      }
    } else if (debitCardId) {
      const debitCard = await DebitCard.findOne({ _id: debitCardId, user: req.user._id })
        .populate('linkedBankAccount');
      if (!debitCard) return res.status(404).json({ success: false, message: 'Debit card not found' });
      bankAccount = debitCard.linkedBankAccount;
      if (payAmount > bankAccount.balance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient Balance. Your account contains only ₹${bankAccount.balance.toLocaleString('en-IN')}.`
        });
      }
    }

    // ── Update loan advance paid amount ──
    const emiAmount = Math.round(getLoanEMI(loan));
    const totalEMIs = loan.tenureYears * 12;
    const newAdvance = (loan.advancePaidAmount || 0) + payAmount;
    const effectivePaidEMIs = loan.paidEMIs + Math.floor(newAdvance / emiAmount);

    loan.advancePaidAmount = newAdvance;
    if (effectivePaidEMIs >= totalEMIs) loan.status = 'completed';
    await loan.save();

    // ── Deduct from bank account ──
    if (bankAccount) {
      await BankAccount.findByIdAndUpdate(bankAccount._id, { $inc: { balance: -payAmount } });
    }

    // ── Record transaction ──
    if (bankAccount) {
      await Transaction.create({
        user: req.user._id,
        type: 'expense',
        amount: payAmount,
        category: 'loan_emi',
        description: `Advance Payment - ${loan.title}`,
        date: new Date(),
        paymentMethod: 'netbanking',
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        isLoanEMI: true,
        loanId: loan._id,
        loanTitle: loan.title,
      });
    }

    res.json({
      success: true,
      loan,
      paidFrom: bankAccount?.bankName || loan.bankName,
      remainingBalance: bankAccount ? bankAccount.balance - payAmount : null,
      emisCovered: Math.floor(newAdvance / emiAmount),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getLoans, createLoan, updateLoan, deleteLoan, payEMI, advancePayment, getUpcomingEMIs };
