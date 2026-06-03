const BankAccount = require('../models/BankAccount');
const DebitCard = require('../models/DebitCard');

// GET /api/bank-accounts
const getBankAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bank-accounts
const createBankAccount = async (req, res) => {
  try {
    const { bankName, accountNumber, balance } = req.body;
    if (!bankName || !accountNumber) {
      return res.status(400).json({ success: false, message: 'Bank name and account number are required' });
    }
    const account = await BankAccount.create({
      user: req.user._id,
      bankName,
      accountNumber,
      balance: Number(balance) || 0
    });
    res.status(201).json({ success: true, account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/bank-accounts/:id/balance
const updateBalance = async (req, res) => {
  try {
    const { balance } = req.body;
    if (balance === undefined || balance < 0) {
      return res.status(400).json({ success: false, message: 'Valid balance is required' });
    }
    const account = await BankAccount.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { balance: Number(balance) },
      { new: true }
    );
    if (!account) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/bank-accounts/:id
const deleteBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }
    // Remove linked debit cards too
    await DebitCard.deleteMany({ linkedBankAccount: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Bank account deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBankAccounts, createBankAccount, updateBalance, deleteBankAccount };
