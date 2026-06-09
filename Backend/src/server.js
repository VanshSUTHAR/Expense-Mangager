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
    const allowedOrigins = [
      /^http:\/\/localhost(:\d+)?$/,
      /^https:\/\/.*\.vercel\.app$/,
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? origin === allowed : allowed.test(origin)
    )) {
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

// Export app for Vercel serverless functions
module.exports = app;

// Start server locally if not in serverless environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`${FaRocket.name} Server running on port ${PORT}`)
  );
}
