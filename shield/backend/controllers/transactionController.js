const Transaction = require('../models/Transaction');
const { detectFraud } = require('../utils/fraudDetection');
const { broadcastUpdate } = require('../utils/websocket');

// Get all transactions
exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ timestamp: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a single transaction
exports.getTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new transaction
exports.createTransaction = async (req, res) => {
    try {
        const transactionData = req.body;
        const fraudResult = await detectFraud(transactionData);
        
        const transaction = new Transaction({
            ...transactionData,
            ...fraudResult
        });
        
        await transaction.save();

        // Get updated stats for real-time dashboard update
        const stats = await getUpdatedStats();
        
        // Broadcast updates through WebSocket
        broadcastUpdate({
            type: 'new_transaction',
            transaction,
            stats
        });

        if (fraudResult.isFraudulent) {
            broadcastUpdate({
                type: 'fraud_alert',
                alert: {
                    transaction,
                    fraudFlags: fraudResult.fraudFlags
                }
            });
        }

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get fraud statistics
exports.getFraudStats = async (req, res) => {
    try {
        const stats = await getUpdatedStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get recent transactions for an account
exports.getAccountTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ 
            accountId: req.params.accountId 
        }).sort({ timestamp: -1 }).limit(10);
        
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to get updated stats
async function getUpdatedStats() {
    const totalTransactions = await Transaction.countDocuments();
    const fraudulentTransactions = await Transaction.countDocuments({ isFraudulent: true });
    const totalAmount = await Transaction.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // Get fraud type statistics
    const flagStats = await Transaction.aggregate([
        { $match: { isFraudulent: true } },
        { $unwind: '$fraudFlags' },
        { $group: {
            _id: '$fraudFlags',
            count: { $sum: 1 }
        }}
    ]);

    // Get timeline data
    const timelineData = {
        all: await getTimelineData(),
        fraudulent: await getTimelineData(true)
    };

    // Get risk distribution
    const riskDistribution = {
        high: await Transaction.countDocuments({ 'fraudFlags.3': { $exists: true } }),
        medium: await Transaction.countDocuments({ 
            'fraudFlags.1': { $exists: true },
            'fraudFlags.3': { $exists: false }
        }),
        low: await Transaction.countDocuments({ isFraudulent: false })
    };

    // Get top locations
    const topLocations = await Transaction.aggregate([
        { $group: {
            _id: '$location',
            count: { $sum: 1 }
        }},
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: {
            name: '$_id',
            count: 1,
            _id: 0
        }}
    ]);

    // Get recent transactions
    const recentTransactions = await Transaction.find()
        .sort({ timestamp: -1 })
        .limit(10);

    return {
        totalTransactions,
        fraudulentTransactions,
        fraudulentPercentage: (fraudulentTransactions / totalTransactions) * 100,
        totalAmount: totalAmount[0]?.total || 0,
        flagStats,
        timelineData,
        riskDistribution,
        topLocations,
        recentTransactions
    };
}

// Helper function to get timeline data
async function getTimelineData(fraudulentOnly = false) {
    const match = fraudulentOnly ? { isFraudulent: true } : {};
    const hours = 24;
    
    const timeline = await Transaction.aggregate([
        { $match: match },
        { $match: {
            timestamp: { 
                $gte: new Date(Date.now() - hours * 60 * 60 * 1000)
            }
        }},
        { $group: {
            _id: {
                $dateToString: {
                    format: "%Y-%m-%d %H:00:00",
                    date: "$timestamp"
                }
            },
            count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
    ]);

    return timeline.map(point => ({
        timestamp: point._id,
        count: point.count
    }));
} 