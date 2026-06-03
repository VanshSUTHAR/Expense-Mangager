const express = require('express');
const router = express.Router();
const { getBankAccounts, createBankAccount, updateBalance, deleteBankAccount } = require('../controllers/bankAccount.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getBankAccounts);
router.post('/', createBankAccount);
router.put('/:id/balance', updateBalance);
router.delete('/:id', deleteBankAccount);

module.exports = router;
