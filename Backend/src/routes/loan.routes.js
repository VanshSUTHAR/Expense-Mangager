const express = require('express');
const router = express.Router();
const { getLoans, createLoan, updateLoan, deleteLoan, payEMI } = require('../controllers/loan.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getLoans);
router.post('/', createLoan);
router.put('/:id', updateLoan);
router.delete('/:id', deleteLoan);
router.post('/:id/pay-emi', payEMI);

module.exports = router;