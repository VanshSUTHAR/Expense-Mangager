const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { syncCreditCardStatements } = require('./creditCardBill.controller');

// @GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const {
      type,
      category,
      bankName,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const query = { user: req.user._id };

    if (type) query.type = type;
    if (category) query.category = category;
    if (bankName) query.bankName = bankName;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      transactions,
      total,
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.log('getTransactions error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

 const createTransaction = async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      description,
      date,
      time,
      paymentMethod,
      bankName,
      accountNumber,
      tags,
      isRecurring,
      recurringFrequency
    } = req.body;

     const payload = {
      user: req.user._id,
      type,
      amount: Number(amount),
      category: category || (type === 'income' ? 'income' : ''),
      description: description || '',
      date: date || new Date(),
      time: time || '',
      paymentMethod: type === 'income' ? '' : (paymentMethod || 'card'),
      bankName: bankName || '',
      accountNumber: accountNumber || '',
      tags: tags || [],
      isRecurring: isRecurring || false,
      recurringFrequency: recurringFrequency || null
    };

    if (!payload.category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    const transaction = await Transaction.create(payload);
    await syncCreditCardStatements(req.user._id);

    // Budget Alert
    const user = await User.findById(req.user._id);

    if (user?.monthlyBudget > 0 && transaction.type === 'expense') {
      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );

      const totalExpense = await Transaction.aggregate([
        {
          $match: {
            user: req.user._id,
            type: 'expense',
            date: { $gte: startOfMonth }
          }
        },
        {
          $group: { _id: null, total: { $sum: '$amount' } }
        }
      ]);

      const spent = totalExpense[0]?.total || 0;
      const percentage = (spent / user.monthlyBudget) * 100;

      if (percentage >= 80) {
        await Notification.create({
          user: req.user._id,
          title: '⚠️ Budget Alert!',
          message: `You've used ${percentage.toFixed(0)}% of your monthly budget (₹${spent.toFixed(0)} of ₹${user.monthlyBudget})`,
          type: 'budget',
          icon: '💸'
        });
      }
    }

    res.status(201).json({ success: true, transaction });

  } catch (error) {
    console.log('createTransaction error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      description,
      date,
      time,
      paymentMethod,
      bankName,
      accountNumber
    } = req.body;

    const updatePayload = {
      type,
      amount: Number(amount),
      category,
      description: description || '',
      date,
      time: time || '',
      paymentMethod: type === 'income' ? '' : (paymentMethod || 'card'),
      bankName: bankName || '',
      accountNumber: accountNumber || ''
    };

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updatePayload,
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await syncCreditCardStatements(req.user._id);

    res.json({ success: true, transaction });

  } catch (error) {
    console.log('updateTransaction error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await syncCreditCardStatements(req.user._id);

    res.json({ success: true, message: 'Transaction deleted' });

  } catch (error) {
    console.log('deleteTransaction error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @GET /api/transactions/stats
const getStats = async (req, res) => {
  try {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const stats = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startOfMonth }
        }
      },
      {
        $group: { _id: '$type', total: { $sum: '$amount' } }
      }
    ]);

    const categoryStats = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: startOfMonth }
        }
      },
      {
        $group: { _id: '$category', total: { $sum: '$amount' } }
      },
      { $sort: { total: -1 } },
      { $limit: 6 }
    ]);

    const monthlyTrend = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(
              new Date().setMonth(new Date().getMonth() - 6)
            )
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            year: { $year: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({ success: true, stats, categoryStats, monthlyTrend });

  } catch (error) {
    console.log('getStats error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getStats
};
