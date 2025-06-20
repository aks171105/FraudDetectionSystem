const Transaction = require('../models/Transaction');
const { detectFraud } = require('../utils/fraudDetection');
const { broadcastUpdate } = require('../utils/websocket');
const fileParser = require('../utils/fileParser');
const fs = require('fs');
const path = require('path');

// Upload and process file
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                message: 'No file uploaded',
                error: 'Please select a CSV or TXT file to upload'
            });
        }

        // Parse the uploaded file
        const transactions = await fileParser.parseFile(req.file);
        
        if (transactions.length === 0) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                message: 'No valid transactions found in file',
                error: 'Please check your file format and ensure it contains valid transaction data'
            });
        }

        // Process each transaction with fraud detection
        const processedTransactions = [];
        let fraudCount = 0;
        let totalAmount = 0;

        for (const transactionData of transactions) {
            try {
                const fraudResult = await detectFraud(transactionData);
                
                const transaction = new Transaction({
                    ...transactionData,
                    ...fraudResult
                });
                
                await transaction.save();
                processedTransactions.push(transaction);
                
                if (fraudResult.isFraudulent) {
                    fraudCount++;
                }
                
                totalAmount += transactionData.amount;
                
            } catch (error) {
                console.error('Error processing transaction:', error);
                // Continue processing other transactions
            }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        // Get updated stats for real-time dashboard update
        const stats = await getUpdatedStats();
        
        // Broadcast updates through WebSocket
        broadcastUpdate({
            type: 'bulk_upload_complete',
            data: {
                totalProcessed: processedTransactions.length,
                fraudCount: fraudCount,
                totalAmount: totalAmount,
                transactions: processedTransactions
            },
            stats
        });

        res.json({
            message: 'File uploaded and processed successfully',
            summary: {
                totalProcessed: processedTransactions.length,
                fraudCount: fraudCount,
                totalAmount: totalAmount,
                fraudPercentage: processedTransactions.length > 0 ? (fraudCount / processedTransactions.length) * 100 : 0
            },
            transactions: processedTransactions
        });

    } catch (error) {
        // Clean up uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        console.error('File upload error:', error);
        res.status(500).json({ 
            message: 'Error processing file',
            error: error.message 
        });
    }
};

// Get sample file formats
exports.getSampleFormats = async (req, res) => {
    try {
        const format = req.params.format || 'csv';
        
        let sampleData;
        if (format.toLowerCase() === 'txt') {
            sampleData = fileParser.getSampleTXT();
        } else {
            sampleData = fileParser.getSampleCSV();
        }
        
        res.json({
            format: format,
            sample: sampleData,
            headers: [
                'accountId (required)',
                'amount (required)',
                'description',
                'category',
                'location',
                'ipAddress',
                'timestamp'
            ],
            description: 'Upload a CSV or TXT file with transaction data. The first row should contain headers.'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get upload statistics
exports.getUploadStats = async (req, res) => {
    try {
        const stats = await getUpdatedStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to get updated stats (reused from transactionController)
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

// Helper function to get timeline data (reused from transactionController)
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