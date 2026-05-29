const express = require('express');
const router = express.Router();
const { getTransactions, createTransaction, updateTransaction, deleteTransaction, getStats } = require('../controllers/transaction.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/stats', getStats);
router.get('/', getTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
