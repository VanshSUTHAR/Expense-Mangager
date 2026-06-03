const DebitCard = require('../models/DebitCard');
const BankAccount = require('../models/BankAccount');

// GET /api/debit-cards
const getDebitCards = async (req, res) => {
  try {
    const cards = await DebitCard.find({ user: req.user._id })
      .populate('linkedBankAccount')
      .sort({ createdAt: -1 });
    res.json({ success: true, cards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/debit-cards
const createDebitCard = async (req, res) => {
  try {
    const { cardName, cardNumber, linkedBankAccountId } = req.body;
    if (!cardName || !cardNumber || !linkedBankAccountId) {
      return res.status(400).json({ success: false, message: 'Card name, card number, and linked bank account are required' });
    }
    const bankAccount = await BankAccount.findOne({ _id: linkedBankAccountId, user: req.user._id });
    if (!bankAccount) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }
    const card = await DebitCard.create({
      user: req.user._id,
      cardName,
      cardNumber,
      linkedBankAccount: linkedBankAccountId
    });
    await card.populate('linkedBankAccount');
    res.status(201).json({ success: true, card });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/debit-cards/:id
const deleteDebitCard = async (req, res) => {
  try {
    const card = await DebitCard.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!card) {
      return res.status(404).json({ success: false, message: 'Debit card not found' });
    }
    res.json({ success: true, message: 'Debit card deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/debit-cards/:id/balance — fetch linked bank balance for a card
const getCardBalance = async (req, res) => {
  try {
    const card = await DebitCard.findOne({ _id: req.params.id, user: req.user._id })
      .populate('linkedBankAccount');
    if (!card) {
      return res.status(404).json({ success: false, message: 'Debit card not found' });
    }
    res.json({
      success: true,
      balance: card.linkedBankAccount.balance,
      bankName: card.linkedBankAccount.bankName,
      accountNumber: card.linkedBankAccount.accountNumber
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDebitCards, createDebitCard, deleteDebitCard, getCardBalance };
