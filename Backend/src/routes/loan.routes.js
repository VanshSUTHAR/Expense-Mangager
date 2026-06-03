const express = require('express');
const router = express.Router();
const { getLoans, createLoan, updateLoan, deleteLoan, payEMI, advancePayment, getUpcomingEMIs } = require('../controllers/loan.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/upcoming-emis', getUpcomingEMIs);
router.get('/', getLoans);
router.post('/', createLoan);
router.put('/:id', updateLoan);
router.delete('/:id', deleteLoan);
router.post('/:id/pay-emi', payEMI);
router.post('/:id/advance-payment', advancePayment);

module.exports = router;
