const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/fraudshield', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// 1. Pattern Matching: Identify repeated patterns across multiple accounts
const detectPatternMatching = async () => {
    console.log('\n=== PATTERN MATCHING ANALYSIS ===');
    
    // Find transactions with same amount across different accounts
    const amountPatterns = await Transaction.aggregate([
        {
            $group: {
                _id: '$amount',
                count: { $sum: 1 },
                accounts: { $addToSet: '$accountId' },
                transactions: { $push: '$$ROOT' }
            }
        },
        {
            $match: {
                count: { $gt: 1 },
                'accounts.1': { $exists: true } // At least 2 different accounts
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    console.log('🔍 Repeated Amount Patterns:');
    amountPatterns.forEach(pattern => {
        console.log(`   Amount: $${pattern._id} | Count: ${pattern.count} | Accounts: ${pattern.accounts.join(', ')}`);
    });

    // Find transactions with same IP across different accounts
    const ipPatterns = await Transaction.aggregate([
        {
            $group: {
                _id: '$ipAddress',
                count: { $sum: 1 },
                accounts: { $addToSet: '$accountId' },
                transactions: { $push: '$$ROOT' }
            }
        },
        {
            $match: {
                count: { $gt: 1 },
                'accounts.1': { $exists: true }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);

    console.log('\n🔍 Same IP Across Multiple Accounts:');
    ipPatterns.forEach(pattern => {
        console.log(`   IP: ${pattern._id} | Count: ${pattern.count} | Accounts: ${pattern.accounts.join(', ')}`);
    });

    return { amountPatterns, ipPatterns };
};

// 2. Transaction Cycle Anomalies: High-frequency transactions in short time windows
const detectTransactionCycleAnomalies = async () => {
    console.log('\n=== TRANSACTION CYCLE ANOMALIES ===');
    
    const anomalies = await Transaction.aggregate([
        {
            $group: {
                _id: '$accountId',
                transactions: { $push: '$$ROOT' },
                totalCount: { $sum: 1 }
            }
        },
        {
            $match: {
                totalCount: { $gt: 5 } // Accounts with more than 5 transactions
            }
        }
    ]);

    const suspiciousAccounts = [];
    
    for (const account of anomalies) {
        const sortedTransactions = account.transactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Check for high-frequency transactions (more than 3 in 1 hour)
        for (let i = 0; i < sortedTransactions.length - 2; i++) {
            const timeDiff = new Date(sortedTransactions[i + 2].timestamp) - new Date(sortedTransactions[i].timestamp);
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff <= 1) {
                suspiciousAccounts.push({
                    accountId: account._id,
                    reason: 'High frequency transactions',
                    timeWindow: `${hoursDiff.toFixed(2)} hours`,
                    transactionCount: 3
                });
                break;
            }
        }
    }

    console.log('🔄 High-Frequency Transaction Anomalies:');
    suspiciousAccounts.slice(0, 10).forEach(account => {
        console.log(`   Account: ${account.accountId} | ${account.reason} | Time: ${account.timeWindow}`);
    });

    return suspiciousAccounts;
};

// 3. Location & IP Inconsistency: Frequent location/IP changes
const detectLocationIPInconsistency = async () => {
    console.log('\n=== LOCATION & IP INCONSISTENCY ===');
    
    const inconsistencies = await Transaction.aggregate([
        {
            $group: {
                _id: '$accountId',
                locations: { $addToSet: '$location' },
                ips: { $addToSet: '$ipAddress' },
                transactions: { $push: '$$ROOT' }
            }
        },
        {
            $match: {
                $or: [
                    { 'locations.1': { $exists: true } }, // Multiple locations
                    { 'ips.1': { $exists: true } }        // Multiple IPs
                ]
            }
        }
    ]);

    const suspiciousAccounts = [];
    
    for (const account of inconsistencies) {
        const sortedTransactions = account.transactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Check for location changes within 24 hours
        for (let i = 0; i < sortedTransactions.length - 1; i++) {
            const timeDiff = new Date(sortedTransactions[i + 1].timestamp) - new Date(sortedTransactions[i].timestamp);
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff <= 24 && sortedTransactions[i].location !== sortedTransactions[i + 1].location) {
                suspiciousAccounts.push({
                    accountId: account._id,
                    reason: 'Location change within 24 hours',
                    fromLocation: sortedTransactions[i].location,
                    toLocation: sortedTransactions[i + 1].location,
                    timeDiff: `${hoursDiff.toFixed(2)} hours`
                });
                break;
            }
        }
    }

    console.log('🌍 Location/IP Inconsistencies:');
    suspiciousAccounts.slice(0, 10).forEach(account => {
        console.log(`   Account: ${account.accountId} | ${account.reason} | ${account.fromLocation} → ${account.toLocation} (${account.timeDiff})`);
    });

    return suspiciousAccounts;
};

// 4. High-Value Outliers: Transactions significantly higher than user's average
const detectHighValueOutliers = async () => {
    console.log('\n=== HIGH-VALUE OUTLIERS ===');
    
    const outliers = await Transaction.aggregate([
        {
            $group: {
                _id: '$accountId',
                transactions: { $push: '$$ROOT' },
                avgAmount: { $avg: '$amount' },
                maxAmount: { $max: '$amount' },
                count: { $sum: 1 }
            }
        },
        {
            $match: {
                count: { $gt: 3 } // At least 3 transactions to calculate meaningful average
            }
        },
        {
            $addFields: {
                outlierRatio: { $divide: ['$maxAmount', '$avgAmount'] }
            }
        },
        {
            $match: {
                outlierRatio: { $gt: 5 } // Transaction 5x higher than average
            }
        },
        { $sort: { outlierRatio: -1 } }
    ]);

    console.log('💰 High-Value Outliers:');
    outliers.slice(0, 10).forEach(account => {
        console.log(`   Account: ${account._id} | Max: $${account.maxAmount} | Avg: $${account.avgAmount.toFixed(2)} | Ratio: ${account.outlierRatio.toFixed(2)}x`);
    });

    return outliers;
};

// 5. Odd Timing: Transactions at unusual hours (12 AM - 5 AM)
const detectOddTiming = async () => {
    console.log('\n=== ODD TIMING ANALYSIS ===');
    
    const oddTimingTransactions = await Transaction.find({
        $expr: {
            $and: [
                { $gte: [{ $hour: '$timestamp' }, 0] },
                { $lte: [{ $hour: '$timestamp' }, 5] }
            ]
        }
    }).sort({ timestamp: -1 }).limit(20);

    console.log('🕐 Transactions at Unusual Hours (12 AM - 5 AM):');
    oddTimingTransactions.forEach(tx => {
        const hour = new Date(tx.timestamp).getHours();
        console.log(`   Account: ${tx.accountId} | Amount: $${tx.amount} | Time: ${hour}:00 | Description: ${tx.description}`);
    });

    return oddTimingTransactions;
};

// 6. Category Mismatch: Category doesn't match description logically
const detectCategoryMismatch = async () => {
    console.log('\n=== CATEGORY MISMATCH ANALYSIS ===');
    
    const categoryKeywords = {
        'Food': ['restaurant', 'grocery', 'dining', 'food', 'meal', 'cafe', 'pizza', 'burger'],
        'Shopping': ['electronics', 'clothing', 'shoes', 'accessories', 'store', 'mall', 'retail'],
        'Transport': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'metro', 'bus'],
        'Entertainment': ['movie', 'concert', 'theater', 'game', 'sports', 'netflix', 'spotify'],
        'Utilities': ['electricity', 'water', 'gas', 'internet', 'phone', 'cable', 'utility']
    };

    const mismatches = [];
    const transactions = await Transaction.find().limit(100);

    for (const tx of transactions) {
        const category = tx.category;
        const description = tx.description.toLowerCase();
        
        if (categoryKeywords[category]) {
            const hasMatchingKeyword = categoryKeywords[category].some(keyword => 
                description.includes(keyword)
            );
            
            if (!hasMatchingKeyword) {
                mismatches.push({
                    accountId: tx.accountId,
                    amount: tx.amount,
                    category: tx.category,
                    description: tx.description,
                    reason: 'Category does not match description keywords'
                });
            }
        }
    }

    console.log('🏷️ Category Mismatches:');
    mismatches.slice(0, 10).forEach(tx => {
        console.log(`   Account: ${tx.accountId} | Category: ${tx.category} | Description: ${tx.description} | Amount: $${tx.amount}`);
    });

    return mismatches;
};

// 7. Comprehensive Fraud Summary
const generateFraudSummary = async () => {
    console.log('\n=== COMPREHENSIVE FRAUD SUMMARY ===');
    
    const summary = {
        totalTransactions: await Transaction.countDocuments(),
        fraudulentTransactions: await Transaction.countDocuments({ isFraudulent: true }),
        uniqueAccounts: await Transaction.distinct('accountId').then(accounts => accounts.length),
        fraudTypes: await Transaction.aggregate([
            { $unwind: '$fraudFlags' },
            { $group: { _id: '$fraudFlags', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ])
    };

    console.log('📊 Overall Statistics:');
    console.log(`   Total Transactions: ${summary.totalTransactions}`);
    console.log(`   Fraudulent Transactions: ${summary.fraudulentTransactions}`);
    console.log(`   Fraud Rate: ${((summary.fraudulentTransactions / summary.totalTransactions) * 100).toFixed(2)}%`);
    console.log(`   Unique Accounts: ${summary.uniqueAccounts}`);

    console.log('\n🚨 Fraud Types Detected:');
    summary.fraudTypes.forEach(type => {
        console.log(`   ${type._id}: ${type.count} occurrences`);
    });

    return summary;
};

// Main analysis function
const runComprehensiveAnalysis = async () => {
    try {
        console.log('🔍 STARTING COMPREHENSIVE FRAUD DETECTION ANALYSIS');
        console.log('=' .repeat(60));

        const results = {
            patternMatching: await detectPatternMatching(),
            transactionCycles: await detectTransactionCycleAnomalies(),
            locationIP: await detectLocationIPInconsistency(),
            highValue: await detectHighValueOutliers(),
            oddTiming: await detectOddTiming(),
            categoryMismatch: await detectCategoryMismatch(),
            summary: await generateFraudSummary()
        };

        console.log('\n' + '=' .repeat(60));
        console.log('✅ ANALYSIS COMPLETE');
        
        return results;
    } catch (error) {
        console.error('❌ Error during analysis:', error);
        throw error;
    }
};

// Export for use in other files
module.exports = {
    runComprehensiveAnalysis,
    detectPatternMatching,
    detectTransactionCycleAnomalies,
    detectLocationIPInconsistency,
    detectHighValueOutliers,
    detectOddTiming,
    detectCategoryMismatch,
    generateFraudSummary
};

// Run analysis if this file is executed directly
if (require.main === module) {
    runComprehensiveAnalysis()
        .then(() => {
            console.log('\n🎉 Fraud detection analysis completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Analysis failed:', error);
            process.exit(1);
        });
} 