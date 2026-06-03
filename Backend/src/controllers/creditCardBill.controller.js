const CreditCardBill = require('../models/CreditCardBill');
const Transaction = require('../models/Transaction');

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getDaysRemaining = (dueDate) => {
  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

const getCardKey = (transaction) => {
  const cardNumber = transaction.accountNumber || '';
  const cardName = transaction.bankName || 'Credit Card';
  return `${cardName}::${cardNumber}`;
};

const getBillDueDate = (bill) => {
  if (bill.settlementType === 'emi' && Array.isArray(bill.emiSchedule) && bill.emiSchedule.length > 0) {
    const nextPending = bill.emiSchedule.find((installment) => installment.status !== 'Paid');
    if (nextPending?.dueDate) return new Date(nextPending.dueDate);
  }
  return new Date(bill.dueDate);
};

const normalizeBill = (bill) => {
  const dueDate = getBillDueDate(bill);
  const transactions = bill.transactions || (bill.transaction ? [bill.transaction] : []);
  const paidAmount = Number(bill.paidAmount || 0);
  const totalAmount = Number(bill.totalAmount || bill.amount || 0);
  const outstandingAmount = Math.max(totalAmount - paidAmount, 0);

  return {
    ...bill,
    paidAmount,
    outstandingAmount,
    transactionCount: bill.transactionCount || transactions.length,
    statementDate: bill.statementDate || bill.transactionDate || bill.createdAt,
    dueDate,
    daysRemaining: getDaysRemaining(dueDate),
    transactions,
  };
};

const buildEmiSchedule = (totalAmount, months, startDate) => {
  const installmentCount = Math.max(1, Number(months) || 0);
  const roundedBase = Math.floor((Number(totalAmount) / installmentCount) * 100) / 100;
  const schedule = [];
  let runningTotal = 0;

  for (let index = 1; index <= installmentCount; index += 1) {
    let amount = roundedBase;
    if (index === installmentCount) {
      amount = Number((Number(totalAmount) - runningTotal).toFixed(2));
    }
    runningTotal += amount;
    schedule.push({
      installmentNumber: index,
      dueDate: addDays(startDate, index * 30),
      amount,
      status: 'Pending',
      paidAt: null,
    });
  }

  return schedule;
};

const reconcileOpenStatements = async (userId) => {
  const allBills = await CreditCardBill.find({ user: userId }).sort({ createdAt: 1 });
  const lockedBills = allBills.filter((bill) => ['Paid', 'EMI'].includes(bill.status));
  const lockedTransactionIds = new Set(
    lockedBills.flatMap((bill) => {
      const txIds = bill.transactions || (bill.transaction ? [bill.transaction] : []);
      return txIds.map((transactionId) => String(transactionId));
    })
  );

  // ── Preserve partial payments before deleting open bills ──
  const openBillsBeforeDelete = allBills.filter((bill) =>
    ['Pending', 'Overdue'].includes(bill.status)
  );
  const savedPaidAmounts = {};
  for (const bill of openBillsBeforeDelete) {
    const paid = Number(bill.paidAmount || 0);
    if (paid > 0) {
      savedPaidAmounts[bill.cardKey] = (savedPaidAmounts[bill.cardKey] || 0) + paid;
    }
  }

  await CreditCardBill.deleteMany({ user: userId, status: { $in: ['Pending', 'Overdue'] } });

  const unpaidTransactions = await Transaction.find({
    user: userId,
    type: 'expense',
    paymentMethod: 'credit_card',
    _id: { $nin: [...lockedTransactionIds] },
  })
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const openBillsByCard = new Map();

  for (const transaction of unpaidTransactions) {
    const cardKey = getCardKey(transaction);
    const existingBill = openBillsByCard.get(cardKey);

    if (!existingBill) {
      const statementDate = new Date(transaction.date || transaction.createdAt || new Date());
      const bill = new CreditCardBill({
        user: userId,
        cardKey,
        cardName: transaction.bankName || 'Credit Card',
        cardNumber: transaction.accountNumber || '',
        transactions: [transaction._id],
        totalAmount: Number(transaction.amount) || 0,
        transactionCount: 1,
        statementDate,
        dueDate: addDays(statementDate, 45),
        status: 'Pending',
        paidAt: null,
        settlementType: 'full',
        emiMonths: 0,
        emiAmount: 0,
        emiSchedule: [],
        description: transaction.description || transaction.category || 'Credit card statement',
      });

      openBillsByCard.set(cardKey, bill);
      continue;
    }

    const transactionDate = new Date(transaction.date || transaction.createdAt || new Date());
    const existingStatementDate = new Date(existingBill.statementDate || transactionDate);
    const earliestDate = transactionDate < existingStatementDate ? transactionDate : existingStatementDate;

    existingBill.transactions.push(transaction._id);
    existingBill.totalAmount += Number(transaction.amount) || 0;
    existingBill.transactionCount += 1;
    existingBill.statementDate = earliestDate;
    existingBill.dueDate = addDays(earliestDate, 45);
    existingBill.description = existingBill.description || transaction.description || transaction.category || 'Credit card statement';
  }

  // ── Restore partial payments onto the rebuilt bills ──
  for (const bill of openBillsByCard.values()) {
    const restoredPaid = savedPaidAmounts[bill.cardKey] || 0;
    if (restoredPaid > 0) {
      bill.paidAmount = Math.min(restoredPaid, bill.totalAmount);
      if (bill.paidAmount >= bill.totalAmount) {
        bill.status = 'Paid';
        bill.paidAt = new Date();
      }
    }
    await bill.save();
  }
};

const markOverdueBills = async (userId) => {
  const openBills = await CreditCardBill.find({
    user: userId,
    status: { $in: ['Pending', 'EMI'] },
  });

  const now = startOfDay(new Date());
  for (const bill of openBills) {
    const dueDate = startOfDay(getBillDueDate(bill));
    if (dueDate < now) {
      bill.status = 'Overdue';
      await bill.save();
    }
  }
};

const syncCreditCardStatements = async (userId) => {
  await reconcileOpenStatements(userId);
  await markOverdueBills(userId);
};

const getCreditCardBills = async (req, res) => {
  try {
    await syncCreditCardStatements(req.user._id);

    const bills = await CreditCardBill.find({ user: req.user._id })
      .populate({
        path: 'transactions',
        select: 'amount category description date paymentMethod bankName accountNumber createdAt',
      })
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      bills: bills.map((bill) => normalizeBill(bill)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const payCreditCardBill = async (req, res) => {
  try {
    const amount = Number(req.body.amount || 0);
    const bill = await CreditCardBill.findOne({ _id: req.params.id, user: req.user._id });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Credit card bill not found' });
    }
    if (bill.status === 'Paid') {
      return res.status(400).json({ success: false, message: 'This bill is already paid' });
    }

    const paidAmount = Number(bill.paidAmount || 0);
    const totalAmount = Number(bill.totalAmount || 0);
    const outstanding = Math.max(totalAmount - paidAmount, 0);
    const paymentAmount = amount > 0 ? amount : outstanding;

    if (paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }
    if (paymentAmount > outstanding) {
      return res.status(400).json({ success: false, message: 'Payment amount exceeds outstanding balance' });
    }

    bill.paidAmount = paidAmount + paymentAmount;
    if (bill.paidAmount >= totalAmount) {
      bill.paidAmount = totalAmount;
      bill.status = 'Paid';
      bill.paidAt = new Date();
      bill.settlementType = 'full';
      bill.emiMonths = 0;
      bill.emiAmount = 0;
      bill.emiSchedule = [];
    }
    await bill.save();

    res.json({
      success: true,
      bill: normalizeBill(
        await CreditCardBill.findById(bill._id).populate({
          path: 'transactions',
          select: 'amount category description date paymentMethod bankName accountNumber createdAt',
        })
      ),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const convertCreditCardBillToEMI = async (req, res) => {
  try {
    const months = Number(req.body.months);
    if (![3, 6, 9, 12].includes(months)) {
      return res.status(400).json({ success: false, message: 'EMI duration must be 3, 6, 9, or 12 months' });
    }

    const bill = await CreditCardBill.findOne({ _id: req.params.id, user: req.user._id });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Credit card bill not found' });
    }

    const emiAmount = Number((Number(bill.totalAmount || 0) / months).toFixed(2));
    bill.status = 'EMI';
    bill.settlementType = 'emi';
    bill.emiMonths = months;
    bill.emiAmount = emiAmount;
    bill.paidAt = null;
    bill.dueDate = addDays(new Date(), 30);
    bill.emiSchedule = buildEmiSchedule(bill.totalAmount || 0, months, new Date());
    await bill.save();

    const populated = await CreditCardBill.findById(bill._id)
      .populate({
        path: 'transactions',
        select: 'amount category description date paymentMethod bankName accountNumber createdAt',
      })
      .lean();

    res.json({
      success: true,
      bill: normalizeBill(populated),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCreditCardBills,
  payCreditCardBill,
  convertCreditCardBillToEMI,
  syncCreditCardStatements,
};