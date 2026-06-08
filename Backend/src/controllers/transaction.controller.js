// const Transaction = require('../models/Transaction');
// const Notification = require('../models/Notification');
// const User = require('../models/User');
// const BankAccount = require('../models/BankAccount');
// const DebitCard = require('../models/DebitCard');
// const { syncCreditCardStatements } = require('./creditCardBill.controller');

// // @GET /api/transactions
// const getTransactions = async (req, res) => {
//   try {
//     const {
//       type,
//       category,
//       bankName,
//       startDate,
//       endDate,
//       page = 1,
//       limit = 50
//     } = req.query;

//     const query = { user: req.user._id };

//     if (type) query.type = type;
//     if (category) query.category = category;
//     if (bankName) query.bankName = bankName;

//     if (startDate || endDate) {
//       query.date = {};
//       if (startDate) query.date.$gte = new Date(startDate);
//       if (endDate) query.date.$lte = new Date(endDate);
//     }

//     const transactions = await Transaction.find(query)
//       .sort({ date: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await Transaction.countDocuments(query);

//     res.json({
//       success: true,
//       transactions,
//       total,
//       pages: Math.ceil(total / limit)
//     });

//   } catch (error) {
//     console.log('getTransactions error:', error.message);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

//  const createTransaction = async (req, res) => {
//   try {
//     const {
//       type,
//       amount,
//       category,
//       description,
//       date,
//       time,
//       paymentMethod,
//       bankName,
//       accountNumber,
//       tags,
//       isRecurring,
//       recurringFrequency,
//       debitCardId,
//       bankAccountId
//     } = req.body;

//      const payload = {
//       user: req.user._id,
//       type,
//       amount: Number(amount),
//       category: category || (type === 'income' ? 'income' : ''),
//       description: description || '',
//       date: date || new Date(),
//       time: time || '',
//       paymentMethod: type === 'income' ? '' : (paymentMethod || 'card'),
//       bankName: bankName || '',
//       accountNumber: accountNumber || '',
//       tags: tags || [],
//       isRecurring: isRecurring || false,
//       recurringFrequency: recurringFrequency || null
//     };

//     if (!payload.category) {
//       return res.status(400).json({
//         success: false,
//         message: 'Category is required'
//       });
//     }

//     // ── Balance guard: debit card expense ──
//     let linkedBankAccount = null;
//     if (type === 'expense' && debitCardId) {
//       const debitCard = await DebitCard.findOne({ _id: debitCardId, user: req.user._id })
//         .populate('linkedBankAccount');
//       if (!debitCard) {
//         return res.status(404).json({ success: false, message: 'Debit card not found' });
//       }
//       linkedBankAccount = debitCard.linkedBankAccount;
//       if (Number(amount) > linkedBankAccount.balance) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient Balance. Your account contains only ₹${linkedBankAccount.balance.toLocaleString('en-IN')}.`
//         });
//       }
//     }

//     // ── Balance guard: direct bank account expense ──
//     let directBankAccount = null;
//     if (type === 'expense' && bankAccountId && !debitCardId) {
//       directBankAccount = await BankAccount.findOne({ _id: bankAccountId, user: req.user._id });
//       if (!directBankAccount) {
//         return res.status(404).json({ success: false, message: 'Bank account not found' });
//       }
//       if (Number(amount) > directBankAccount.balance) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient Balance. Your account contains only ₹${directBankAccount.balance.toLocaleString('en-IN')}.`
//         });
//       }
//     }

//     const transaction = await Transaction.create(payload);

//     // ── Deduct: debit card expense ──
//     if (linkedBankAccount) {
//       await BankAccount.findByIdAndUpdate(linkedBankAccount._id, { $inc: { balance: -Number(amount) } });
//     }

//     // ── Deduct: direct bank account expense ──
//     if (directBankAccount) {
//       await BankAccount.findByIdAndUpdate(directBankAccount._id, { $inc: { balance: -Number(amount) } });
//     }

//     // ── Credit: income to bank account ──
//     if (type === 'income' && bankAccountId) {
//       await BankAccount.findOneAndUpdate(
//         { _id: bankAccountId, user: req.user._id },
//         { $inc: { balance: Number(amount) } }
//       );
//     }
//     await syncCreditCardStatements(req.user._id);

//     // Budget Alert
//     const user = await User.findById(req.user._id);

//     if (user?.monthlyBudget > 0 && transaction.type === 'expense') {
//       const startOfMonth = new Date(
//         new Date().getFullYear(),
//         new Date().getMonth(),
//         1
//       );

//       const totalExpense = await Transaction.aggregate([
//         {
//           $match: {
//             user: req.user._id,
//             type: 'expense',
//             date: { $gte: startOfMonth }
//           }
//         },
//         {
//           $group: { _id: null, total: { $sum: '$amount' } }
//         }
//       ]);

//       const spent = totalExpense[0]?.total || 0;
//       const percentage = (spent / user.monthlyBudget) * 100;

//       if (percentage >= 80) {
//         await Notification.create({
//           user: req.user._id,
//           title: 'Budget Alert!',
//           message: `You've used ${percentage.toFixed(0)}% of your monthly budget (₹${spent.toFixed(0)} of ₹${user.monthlyBudget})`,
//           type: 'budget',
//           icon: '💸'
//         });
//       }
//     }

//     res.status(201).json({ success: true, transaction });

//   } catch (error) {
//     console.log('createTransaction error:', error.message);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // @PUT /api/transactions/:id
// const updateTransaction = async (req, res) => {
//   try {
//     const {
//       type,
//       amount,
//       category,
//       description,
//       date,
//       time,
//       paymentMethod,
//       bankName,
//       accountNumber
//     } = req.body;

//     const updatePayload = {
//       type,
//       amount: Number(amount),
//       category,
//       description: description || '',
//       date,
//       time: time || '',
//       paymentMethod: type === 'income' ? '' : (paymentMethod || 'card'),
//       bankName: bankName || '',
//       accountNumber: accountNumber || ''
//     };

//     const transaction = await Transaction.findOneAndUpdate(
//       { _id: req.params.id, user: req.user._id },
//       updatePayload,
//       { new: true }
//     );

//     if (!transaction) {
//       return res.status(404).json({
//         success: false,
//         message: 'Transaction not found'
//       });
//     }

//     await syncCreditCardStatements(req.user._id);

//     res.json({ success: true, transaction });

//   } catch (error) {
//     console.log('updateTransaction error:', error.message);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // @DELETE /api/transactions/:id
// const deleteTransaction = async (req, res) => {
//   try {
//     const transaction = await Transaction.findOneAndDelete({
//       _id: req.params.id,
//       user: req.user._id
//     });

//     if (!transaction) {
//       return res.status(404).json({
//         success: false,
//         message: 'Transaction not found'
//       });
//     }

//     await syncCreditCardStatements(req.user._id);

//     res.json({ success: true, message: 'Transaction deleted' });

//   } catch (error) {
//     console.log('deleteTransaction error:', error.message);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // @GET /api/transactions/stats
// const getStats = async (req, res) => {
//   try {
//     const startOfMonth = new Date(
//       new Date().getFullYear(),
//       new Date().getMonth(),
//       1
//     );

//     const stats = await Transaction.aggregate([
//       {
//         $match: {
//           user: req.user._id,
//           date: { $gte: startOfMonth }
//         }
//       },
//       {
//         $group: { _id: '$type', total: { $sum: '$amount' } }
//       }
//     ]);

//     const categoryStats = await Transaction.aggregate([
//       {
//         $match: {
//           user: req.user._id,
//           type: 'expense',
//           date: { $gte: startOfMonth }
//         }
//       },
//       {
//         $group: { _id: '$category', total: { $sum: '$amount' } }
//       },
//       { $sort: { total: -1 } },
//       { $limit: 6 }
//     ]);

//     const monthlyTrend = await Transaction.aggregate([
//       {
//         $match: {
//           user: req.user._id,
//           date: {
//             $gte: new Date(
//               new Date().setMonth(new Date().getMonth() - 6)
//             )
//           }
//         }
//       },
//       {
//         $group: {
//           _id: {
//             month: { $month: '$date' },
//             year: { $year: '$date' },
//             type: '$type'
//           },
//           total: { $sum: '$amount' }
//         }
//       },
//       { $sort: { '_id.year': 1, '_id.month': 1 } }
//     ]);

//     res.json({ success: true, stats, categoryStats, monthlyTrend });

//   } catch (error) {
//     console.log('getStats error:', error.message);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// module.exports = {
//   getTransactions,
//   createTransaction,
//   updateTransaction,
//   deleteTransaction,
//   getStats
// };


const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const User = require('../models/User');
const BankAccount = require('../models/BankAccount');
const DebitCard = require('../models/DebitCard');
const { syncCreditCardStatements } = require('./creditCardBill.controller');

const CREDIT_CARD_LIMITS = {
  UNION: 10000,
  SBI: 89999,
  HDFC: 150000
};

const getCreditCardLimit = (bankName) => {
  const name = String(bankName || '').toUpperCase();

  if (name.includes('UNION')) return CREDIT_CARD_LIMITS.UNION;
  if (name.includes('SBI')) return CREDIT_CARD_LIMITS.SBI;
  if (name.includes('HDFC')) return CREDIT_CARD_LIMITS.HDFC;

  return null;
};

const isCreditCardPayment = (paymentMethod) => {
  return String(paymentMethod || '').toLowerCase() === 'credit_card';
};

const validateCreditCardLimit = async ({
  userId,
  bankName,
  accountNumber,
  amount,
  paymentMethod,
  excludeTransactionId = null
}) => {
  if (!isCreditCardPayment(paymentMethod)) return;

  const limit = getCreditCardLimit(bankName);
  if (!limit) return;

  const query = {
    user: userId,
    type: 'expense',
    paymentMethod: 'credit_card',
    bankName: bankName || '',
    accountNumber: accountNumber || ''
  };

  if (excludeTransactionId) {
    query._id = { $ne: excludeTransactionId };
  }

  const existingTransactions = await Transaction.find(query).select('amount');
  const alreadyUsed = existingTransactions.reduce(
    (total, transaction) => total + Number(transaction.amount || 0),
    0
  );

  const newAmount = Number(amount || 0);
  const totalAfterTransaction = alreadyUsed + newAmount;
  const available = Math.max(limit - alreadyUsed, 0);

  if (totalAfterTransaction > limit) {
    const error = new Error(
      `${bankName} card limit ₹${limit.toLocaleString('en-IN')} hai. Already used ₹${alreadyUsed.toLocaleString('en-IN')}. Available ₹${available.toLocaleString('en-IN')} hai. Aap ₹${newAmount.toLocaleString('en-IN')} transaction nahi kar sakte.`
    );
    error.statusCode = 400;
    throw error;
  }
};

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
      recurringFrequency,
      debitCardId,
      bankAccountId
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

    if (payload.amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than zero'
      });
    }

    await validateCreditCardLimit({
      userId: req.user._id,
      bankName: payload.bankName,
      accountNumber: payload.accountNumber,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod
    });

    let linkedBankAccount = null;
    if (type === 'expense' && debitCardId) {
      const debitCard = await DebitCard.findOne({ _id: debitCardId, user: req.user._id })
        .populate('linkedBankAccount');

      if (!debitCard) {
        return res.status(404).json({ success: false, message: 'Debit card not found' });
      }

      linkedBankAccount = debitCard.linkedBankAccount;

      if (Number(amount) > linkedBankAccount.balance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient Balance. Your account contains only ₹${linkedBankAccount.balance.toLocaleString('en-IN')}.`
        });
      }
    }

    let directBankAccount = null;
    if (type === 'expense' && bankAccountId && !debitCardId) {
      directBankAccount = await BankAccount.findOne({ _id: bankAccountId, user: req.user._id });

      if (!directBankAccount) {
        return res.status(404).json({ success: false, message: 'Bank account not found' });
      }

      if (Number(amount) > directBankAccount.balance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient Balance. Your account contains only ₹${directBankAccount.balance.toLocaleString('en-IN')}.`
        });
      }
    }

    const transaction = await Transaction.create(payload);

    if (linkedBankAccount) {
      await BankAccount.findByIdAndUpdate(linkedBankAccount._id, { $inc: { balance: -Number(amount) } });
    }

    if (directBankAccount) {
      await BankAccount.findByIdAndUpdate(directBankAccount._id, { $inc: { balance: -Number(amount) } });
    }

    if (type === 'income' && bankAccountId) {
      await BankAccount.findOneAndUpdate(
        { _id: bankAccountId, user: req.user._id },
        { $inc: { balance: Number(amount) } }
      );
    }

    await syncCreditCardStatements(req.user._id);

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
          title: 'Budget Alert!',
          message: `You've used ${percentage.toFixed(0)}% of your monthly budget (₹${spent.toFixed(0)} of ₹${user.monthlyBudget})`,
          type: 'budget',
          icon: '💸'
        });
      }
    }

    res.status(201).json({ success: true, transaction });

  } catch (error) {
    console.log('createTransaction error:', error.message);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
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

    if (updatePayload.amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than zero'
      });
    }

    await validateCreditCardLimit({
      userId: req.user._id,
      bankName: updatePayload.bankName,
      accountNumber: updatePayload.accountNumber,
      amount: updatePayload.amount,
      paymentMethod: updatePayload.paymentMethod,
      excludeTransactionId: req.params.id
    });

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
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
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