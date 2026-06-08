require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const transactionRoutes = require('./routes/transaction.routes');
const { goalRouter, notifRouter } = require('./routes/other.routes');
const loanRoutes = require('./routes/loan.routes');
const creditCardBillRoutes = require('./routes/creditCardBill.routes');
const bankAccountRoutes = require('./routes/bankAccount.routes');
const debitCardRoutes = require('./routes/debitCard.routes');
// React Icons
const { FaMoneyBillWave, FaRocket } = require('react-icons/fa');

connectDB();

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/loans', loanRoutes);
app.use('/api/credit-card-bills', creditCardBillRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/debit-cards', debitCardRoutes);

app.get('/', (req, res) =>
  res.json({
    icon: 'FaMoneyBillWave',
    message: 'Expense Manager API Running',
  })
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`${FaRocket.name} Server running on port ${PORT}`)
);
