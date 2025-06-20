const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Get all transactions
router.get('/', transactionController.getAllTransactions);

// Get fraud statistics
router.get('/stats', transactionController.getFraudStats);

// Get a specific transaction
router.get('/:id', transactionController.getTransaction);

// Get transactions for a specific account
router.get('/account/:accountId', transactionController.getAccountTransactions);

// Create a new transaction
router.post('/', transactionController.createTransaction);

module.exports = router; 