const express = require('express');
const router = express.Router();
const { getCreditCardBills, payCreditCardBill, convertCreditCardBillToEMI } = require('../controllers/creditCardBill.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getCreditCardBills);
router.put('/:id/pay', payCreditCardBill);
router.put('/:id/convert-to-emi', convertCreditCardBillToEMI);

module.exports = router;
