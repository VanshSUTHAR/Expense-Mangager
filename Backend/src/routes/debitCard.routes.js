const express = require('express');
const router = express.Router();
const { getDebitCards, createDebitCard, deleteDebitCard, getCardBalance } = require('../controllers/debitCard.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getDebitCards);
router.post('/', createDebitCard);
router.get('/:id/balance', getCardBalance);
router.delete('/:id', deleteDebitCard);

module.exports = router;
