const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    accountId: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    location: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    deviceId: {
        type: String,
        default: null
    },
    browserId: {
        type: String,
        default: null
    },
    recipientAccountId: {
        type: String,
        default: null
    },
    isFraudulent: {
        type: Boolean,
        default: false
    },
    fraudFlags: [{
        type: String,
        enum: [
            'high_value',
            'frequency_anomaly',
            'location_anomaly',
            'device_anomaly',
            'login_anomaly',
            'suspicious_recipient',
            'circular_transaction',
            'time_anomaly',
            'velocity_anomaly',
            'statistical_outlier'
        ]
    }]
});

module.exports = mongoose.model('Transaction', transactionSchema); 