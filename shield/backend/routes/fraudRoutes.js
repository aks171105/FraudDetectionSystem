const express = require('express');
const router = express.Router();
const { detectFraud } = require('../utils/fraudDetection');
const Transaction = require('../models/Transaction');

// Get fraud detection results for a specific transaction
router.post('/check', async (req, res) => {
    try {
        const transaction = new Transaction(req.body);
        const fraudResult = await detectFraud(transaction);
        res.json(fraudResult);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get fraud statistics by type
router.get('/stats', async (req, res) => {
    try {
        const stats = await Transaction.aggregate([
            {
                $match: { isFraudulent: true }
            },
            {
                $unwind: '$fraudFlags'
            },
            {
                $group: {
                    _id: '$fraudFlags',
                    count: { $sum: 1 }
                }
            }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 