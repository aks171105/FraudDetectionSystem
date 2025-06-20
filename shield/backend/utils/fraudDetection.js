const Transaction = require('../models/Transaction');

// 1. Transaction Amount - Abnormally high?
const checkHighValueTransaction = (amount) => {
    const THRESHOLD = 10000; // $10,000 threshold
    const numAmount = Number(amount);
    console.log('Checking high value:', { amount: numAmount, threshold: THRESHOLD });
    return numAmount > THRESHOLD;
};

// 2. Frequency - Too many too fast?
const checkFrequencyAnomaly = async (accountId) => {
    const TIME_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
    const FREQUENCY_THRESHOLD = 5; // More than 5 transactions in 1 hour
    
    const recentTransactions = await Transaction.countDocuments({
        accountId,
        timestamp: { $gte: new Date(Date.now() - TIME_WINDOW) }
    });
    
    console.log('Frequency check:', { accountId, recentTransactions, threshold: FREQUENCY_THRESHOLD });
    return recentTransactions > FREQUENCY_THRESHOLD;
};

// 3. Location - Mismatch with usual IP/region?
const checkLocationAnomaly = async (accountId, location, ipAddress) => {
    if (!accountId || !location) return false;
    
    // Get recent transactions for this account
    const recentTransactions = await Transaction.find({
        accountId,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ timestamp: -1 }).limit(10);
    
    if (recentTransactions.length === 0) return false;
    
    // Check if location changed suddenly
    const previousLocations = [...new Set(recentTransactions.map(t => t.location))];
    const locationChanged = !previousLocations.includes(location);
    
    // Check if IP address changed (if available)
    let ipChanged = false;
    if (ipAddress && recentTransactions[0].ipAddress) {
        ipChanged = recentTransactions[0].ipAddress !== ipAddress;
    }
    
    console.log('Location check:', { accountId, location, previousLocations, locationChanged, ipChanged });
    return locationChanged || ipChanged;
};

// 4. Device/Browser ID - Changed suddenly?
const checkDeviceAnomaly = async (accountId, deviceId, browserId) => {
    if (!accountId || (!deviceId && !browserId)) return false;
    
    const recentTransactions = await Transaction.find({
        accountId,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 }).limit(5);
    
    if (recentTransactions.length === 0) return false;
    
    // Check if device/browser changed
    const lastTransaction = recentTransactions[0];
    const deviceChanged = deviceId && lastTransaction.deviceId && lastTransaction.deviceId !== deviceId;
    const browserChanged = browserId && lastTransaction.browserId && lastTransaction.browserId !== browserId;
    
    console.log('Device check:', { accountId, deviceChanged, browserChanged });
    return deviceChanged || browserChanged;
};

// 5. Login Pattern - Multiple failed logins, then success
const checkLoginPattern = async (accountId) => {
    // This would typically check against a login attempts collection
    // For now, we'll simulate based on transaction patterns
    const recentTransactions = await Transaction.find({
        accountId,
        timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Last 30 minutes
    }).sort({ timestamp: -1 });
    
    // If there are many transactions in a short time after a gap, it might indicate suspicious login
    if (recentTransactions.length >= 3) {
        const timeSpan = recentTransactions[0].timestamp - recentTransactions[recentTransactions.length - 1].timestamp;
        const avgTimeBetweenTx = timeSpan / (recentTransactions.length - 1);
        
        console.log('Login pattern check:', { accountId, avgTimeBetweenTx });
        return avgTimeBetweenTx < 60000; // Less than 1 minute between transactions
    }
    
    return false;
};

// 6. Recipient account - Blacklisted/suspicious account?
const checkRecipientAccount = async (recipientAccountId, description) => {
    if (!recipientAccountId && !description) return false;
    
    // Check if recipient account has been flagged before
    const suspiciousRecipient = await Transaction.findOne({
        $or: [
            { accountId: recipientAccountId, isFraudulent: true },
            { description: { $regex: recipientAccountId, $options: 'i' }, isFraudulent: true }
        ]
    });
    
    // Check for known suspicious patterns in description
    const suspiciousKeywords = ['urgent', 'emergency', 'help', 'crypto', 'bitcoin', 'gift card'];
    const desc = description ? description.toLowerCase() : '';
    const hasSuspiciousKeywords = suspiciousKeywords.some(keyword => desc.includes(keyword));
    
    console.log('Recipient check:', { recipientAccountId, suspiciousRecipient: !!suspiciousRecipient, hasSuspiciousKeywords });
    return suspiciousRecipient || hasSuspiciousKeywords;
};

// 7. Graph loop - Money flows in circles?
const checkGraphLoop = async (accountId, recipientAccountId) => {
    if (!accountId || !recipientAccountId) return false;
    
    // Check for circular transaction patterns
    const recentTransactions = await Transaction.find({
        $or: [
            { accountId },
            { accountId: recipientAccountId }
        ],
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 }).limit(20);
    
    // Look for back-and-forth transactions between accounts
    const accountTransactions = recentTransactions.filter(t => t.accountId === accountId);
    const recipientTransactions = recentTransactions.filter(t => t.accountId === recipientAccountId);
    
    // Check if there are transactions going both ways
    const hasCircularFlow = accountTransactions.length > 0 && recipientTransactions.length > 0;
    
    console.log('Graph loop check:', { accountId, recipientAccountId, hasCircularFlow });
    return hasCircularFlow;
};

// 8. Time of day - Unusual activity time?
const checkTimeAnomaly = async (accountId, timestamp) => {
    if (!accountId || !timestamp) return false;
    
    const transactionTime = new Date(timestamp);
    const hour = transactionTime.getHours();
    
    // Check if transaction is during unusual hours (2 AM - 6 AM)
    const unusualHours = hour >= 2 && hour <= 6;
    
    // Check account's usual activity pattern
    const accountTransactions = await Transaction.find({
        accountId,
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });
    
    if (accountTransactions.length > 0) {
        const usualHours = accountTransactions.map(t => new Date(t.timestamp).getHours());
        const avgHour = usualHours.reduce((a, b) => a + b, 0) / usualHours.length;
        const hourDeviation = Math.abs(hour - avgHour);
        
        console.log('Time anomaly check:', { accountId, hour, unusualHours, avgHour, hourDeviation });
        return unusualHours || hourDeviation > 6; // More than 6 hours from usual time
    }
    
    return unusualHours;
};

// 9. Velocity - Too many actions in a short time?
const checkVelocityAnomaly = async (accountId, timestamp) => {
    if (!accountId || !timestamp) return false;
    
    const timeWindows = [
        { window: 5 * 60 * 1000, threshold: 3 },   // 5 minutes: 3 transactions
        { window: 15 * 60 * 1000, threshold: 5 },  // 15 minutes: 5 transactions
        { window: 60 * 60 * 1000, threshold: 10 }  // 1 hour: 10 transactions
    ];
    
    for (const { window, threshold } of timeWindows) {
        const recentTransactions = await Transaction.countDocuments({
            accountId,
            timestamp: { $gte: new Date(new Date(timestamp).getTime() - window) }
        });
        
        if (recentTransactions > threshold) {
            console.log('Velocity anomaly:', { accountId, window: window / 60000, recentTransactions, threshold });
            return true;
        }
    }
    
    return false;
};

// 10. Statistical outlier - Amount significantly different from normal pattern
const checkStatisticalOutlier = async (accountId, amount) => {
    if (!accountId || !amount) return false;
    
    const accountTransactions = await Transaction.find({
        accountId,
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });
    
    if (accountTransactions.length < 5) return false; // Need at least 5 transactions for statistical analysis
    
    const amounts = accountTransactions.map(t => Number(t.amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return false;
    
    const zScore = Math.abs((Number(amount) - mean) / stdDev);
    
    console.log('Statistical outlier:', { accountId, amount, mean, stdDev, zScore });
    return zScore > 2.5; // More than 2.5 standard deviations from mean
};

// Main fraud detection function
const detectFraud = async (transaction) => {
    try {
        console.log('Received transaction for fraud detection:', transaction);
        
        // Validate transaction data
        if (!transaction || typeof transaction !== 'object') {
            console.error('Invalid transaction data received');
            return { isFraudulent: false, fraudFlags: [] };
        }

        const { 
            amount, 
            accountId, 
            description, 
            location, 
            timestamp, 
            ipAddress,
            deviceId,
            browserId,
            recipientAccountId
        } = transaction;
        
        if (!amount || !accountId) {
            console.error('Missing required transaction fields');
            return { isFraudulent: false, fraudFlags: [] };
        }

        const fraudFlags = [];
        
        // 1. Transaction amount - Abnormally high?
        if (checkHighValueTransaction(amount)) {
            fraudFlags.push('high_value');
        }
        
        // 2. Frequency - Too many too fast?
        if (await checkFrequencyAnomaly(accountId)) {
            fraudFlags.push('frequency_anomaly');
        }
        
        // 3. Location - Mismatch with usual IP/region?
        if (await checkLocationAnomaly(accountId, location, ipAddress)) {
            fraudFlags.push('location_anomaly');
        }
        
        // 4. Device/Browser ID - Changed suddenly?
        if (await checkDeviceAnomaly(accountId, deviceId, browserId)) {
            fraudFlags.push('device_anomaly');
        }
        
        // 5. Login pattern - Multiple failed logins, then success
        if (await checkLoginPattern(accountId)) {
            fraudFlags.push('login_anomaly');
        }
        
        // 6. Recipient account - Blacklisted/suspicious account?
        if (await checkRecipientAccount(recipientAccountId, description)) {
            fraudFlags.push('suspicious_recipient');
        }
        
        // 7. Graph loop - Money flows in circles?
        if (await checkGraphLoop(accountId, recipientAccountId)) {
            fraudFlags.push('circular_transaction');
        }
        
        // 8. Time of day - Unusual activity time?
        if (await checkTimeAnomaly(accountId, timestamp)) {
            fraudFlags.push('time_anomaly');
        }
        
        // 9. Velocity - Too many actions in a short time?
        if (await checkVelocityAnomaly(accountId, timestamp)) {
            fraudFlags.push('velocity_anomaly');
        }
        
        // 10. Statistical outlier - Amount significantly different from normal pattern
        if (await checkStatisticalOutlier(accountId, amount)) {
            fraudFlags.push('statistical_outlier');
        }
        
        console.log('Fraud detection results:', {
            transactionId: transaction._id,
            fraudFlags,
            isFraudulent: fraudFlags.length > 0
        });
        
        return {
            isFraudulent: fraudFlags.length > 0,
            fraudFlags
        };
    } catch (error) {
        console.error('Error in fraud detection:', error);
        return {
            isFraudulent: false,
            fraudFlags: []
        };
    }
};

module.exports = {
    detectFraud,
    checkHighValueTransaction,
    checkFrequencyAnomaly,
    checkLocationAnomaly,
    checkDeviceAnomaly,
    checkLoginPattern,
    checkRecipientAccount,
    checkGraphLoop,
    checkTimeAnomaly,
    checkVelocityAnomaly,
    checkStatisticalOutlier
}; 