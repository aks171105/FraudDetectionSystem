// API Configuration
const API_URL = 'http://localhost:5002/api';

// WebSocket Configuration
let ws;

// DOM Elements
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('.section');
const modal = document.getElementById('add-transaction-modal');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const closeModalBtn = document.querySelector('.close');
const transactionForm = document.getElementById('transaction-form');
const transactionSearch = document.getElementById('transaction-search');
const transactionsBody = document.getElementById('transactions-body');
const alertsContainer = document.getElementById('alerts-container');

// File Upload Elements
const transactionFile = document.getElementById('transaction-file');
const uploadDropZone = document.getElementById('upload-drop-zone');
const browseBtn = document.getElementById('browse-btn');
const uploadBtn = document.getElementById('upload-btn');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const showSampleBtn = document.getElementById('show-sample-btn');

// Sample Format Modal Elements
const sampleFormatModal = document.getElementById('sample-format-modal');
const sampleFormatCloseBtn = sampleFormatModal.querySelector('.close');
const tabBtns = document.querySelectorAll('.tab-btn');
const formatSamples = document.querySelectorAll('.format-sample');

// Initialize WebSocket connection
function initializeWebSocket() {
    ws = new WebSocket('ws://localhost:5002');
    
    ws.onopen = function() {
        console.log('WebSocket connected');
    };
    
    ws.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    
    ws.onclose = function() {
        console.log('WebSocket disconnected');
        // Try to reconnect after 5 seconds
        setTimeout(initializeWebSocket, 5000);
    };
    
    ws.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    console.log('Received WebSocket message:', data);
    
    switch (data.type) {
        case 'new_transaction':
            // Update dashboard stats
            if (data.stats) {
                updateDashboardStats(data.stats);
            }
            // Add new transaction to the list
            addNewTransaction(data.transaction);
            break;
            
        case 'bulk_upload_complete':
            // Update dashboard stats
            if (data.stats) {
                updateDashboardStats(data.stats);
            }
            // Show upload summary
            if (data.data) {
                showUploadSummary(data.data);
            }
            // Reload transactions list
            loadTransactions();
            break;
            
        case 'fraud_alert':
            // Show fraud alert notification
            if (data.alert) {
                showFraudAlert(data.alert);
            }
            break;
            
        default:
            console.log('Unknown WebSocket message type:', data.type);
    }
}

// Update dashboard stats from WebSocket data
function updateDashboardStats(stats) {
    // Update summary statistics
    document.getElementById('total-transactions').textContent = stats.totalTransactions;
    document.getElementById('fraudulent-transactions').textContent = stats.fraudulentTransactions;
    document.getElementById('fraud-percentage').textContent = `${stats.fraudulentPercentage.toFixed(2)}%`;
    document.getElementById('total-amount').textContent = `$${stats.totalAmount.toLocaleString()}`;
    
    // Update risk distribution
    const highRiskCount = stats.riskDistribution?.high || 0;
    const mediumRiskCount = stats.riskDistribution?.medium || 0;
    const lowRiskCount = stats.riskDistribution?.low || 0;
    const totalRisk = highRiskCount + mediumRiskCount + lowRiskCount;

    if (totalRisk > 0) {
        document.getElementById('high-risk-bar').style.width = `${(highRiskCount / totalRisk) * 100}%`;
        document.getElementById('medium-risk-bar').style.width = `${(mediumRiskCount / totalRisk) * 100}%`;
        document.getElementById('low-risk-bar').style.width = `${(lowRiskCount / totalRisk) * 100}%`;
    }

    document.getElementById('high-risk-count').textContent = `${highRiskCount} transactions`;
    document.getElementById('medium-risk-count').textContent = `${mediumRiskCount} transactions`;
    document.getElementById('low-risk-count').textContent = `${lowRiskCount} transactions`;

    // Update recent activity
    const recentActivity = document.getElementById('recent-activity');
    recentActivity.innerHTML = stats.recentTransactions?.map(transaction => `
        <div class="activity-item">
            <div class="activity-icon ${transaction.isFraudulent ? 'fraud' : 'safe'}">
                ${transaction.isFraudulent ? '⚠️' : '✓'}
            </div>
            <div class="activity-details">
                <div class="activity-amount">$${transaction.amount.toLocaleString()}</div>
                <div class="activity-info">${transaction.description}</div>
                <div class="activity-time">${new Date(transaction.timestamp).toLocaleString()}</div>
            </div>
        </div>
    `).join('') || '';

    // Update location stats
    const locationStats = document.getElementById('location-stats');
    locationStats.innerHTML = stats.topLocations?.map(location => `
        <div class="location-item">
            <span class="location-name">${location.name}</span>
            <span class="location-count">${location.count}</span>
        </div>
    `).join('') || '';

    // Update charts
    if (stats.flagStats) {
        updateFraudTypesChart(stats.flagStats);
    }
    
    if (stats.timelineData) {
        updateTimeChart(stats.timelineData);
    }
}

// Add new transaction to the list
function addNewTransaction(transaction) {
    const newRow = document.createElement('tr');
    newRow.className = transaction.isFraudulent ? 'fraud' : '';
    newRow.innerHTML = `
        <td>${transaction.accountId}</td>
        <td>$${transaction.amount.toFixed(2)}</td>
        <td>${transaction.description}</td>
        <td>${transaction.category}</td>
        <td>${transaction.location}</td>
        <td>
            <span class="status ${transaction.isFraudulent ? 'fraud' : 'safe'}">
                ${transaction.isFraudulent ? 'Fraudulent' : 'Safe'}
            </span>
        </td>
        <td>${new Date(transaction.timestamp).toLocaleString()}</td>
    `;
    
    // Add to the top of the table
    const tbody = document.getElementById('transactions-body');
    if (tbody.firstChild) {
        tbody.insertBefore(newRow, tbody.firstChild);
    } else {
        tbody.appendChild(newRow);
    }
}

// Show fraud alert notification
function showFraudAlert(alert) {
    const notification = document.createElement('div');
    notification.className = 'notification fraud-alert';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem;
        border-radius: 0.375rem;
        color: white;
        font-weight: 500;
        z-index: 3000;
        max-width: 300px;
        background-color: #e53e3e;
        border-left: 4px solid #742a2a;
    `;
    notification.innerHTML = `
        <h4>🚨 Fraud Alert!</h4>
        <p><strong>Account:</strong> ${alert.transaction.accountId}</p>
        <p><strong>Amount:</strong> $${alert.transaction.amount.toFixed(2)}</p>
        <p><strong>Flags:</strong> ${alert.fraudFlags.join(', ')}</p>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 10000);
}

// Navigation
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSection = link.getAttribute('data-section');
        
        // Update active states
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetSection) {
                section.classList.add('active');
            }
        });
        
        // Load section data
        if (targetSection === 'transactions') {
            loadTransactions();
        } else if (targetSection === 'dashboard') {
            loadDashboardStats();
        } else if (targetSection === 'fraud-alerts') {
            loadFraudAlerts();
        }
    });
});

// Modal Handling
addTransactionBtn.addEventListener('click', () => {
    modal.style.display = 'block';
});

closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
    if (e.target === sampleFormatModal) {
        sampleFormatModal.style.display = 'none';
    }
});

// File Upload Handling
browseBtn.addEventListener('click', () => {
    transactionFile.click();
});

transactionFile.addEventListener('change', handleFileSelect);

// Drag and drop functionality
uploadDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadDropZone.classList.add('dragover');
});

uploadDropZone.addEventListener('dragleave', () => {
    uploadDropZone.classList.remove('dragover');
});

uploadDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadDropZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        transactionFile.files = files;
        handleFileSelect();
    }
});

uploadDropZone.addEventListener('click', () => {
    transactionFile.click();
});

uploadBtn.addEventListener('click', uploadFile);

// Sample format modal
showSampleBtn.addEventListener('click', () => {
    sampleFormatModal.style.display = 'block';
});

sampleFormatCloseBtn.addEventListener('click', () => {
    sampleFormatModal.style.display = 'none';
});

// Tab switching in sample format modal
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const format = btn.getAttribute('data-format');
        
        // Update active tab
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active content
        formatSamples.forEach(sample => {
            sample.classList.remove('active');
            if (sample.id === `${format}-sample`) {
                sample.classList.add('active');
            }
        });
    });
});

function handleFileSelect() {
    const file = transactionFile.files[0];
    if (file) {
        const allowedTypes = ['.csv', '.txt'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (allowedTypes.includes(fileExtension)) {
            uploadBtn.disabled = false;
            uploadDropZone.innerHTML = `
                <div class="upload-icon">📄</div>
                <p><strong>${file.name}</strong></p>
                <p>Size: ${(file.size / 1024).toFixed(2)} KB</p>
            `;
        } else {
            showNotification('Please select a CSV or TXT file', 'error');
            resetFileUpload();
        }
    }
}

async function uploadFile() {
    const file = transactionFile.files[0];
    if (!file) {
        showNotification('Please select a file first', 'error');
        return;
    }

    console.log('Starting file upload:', file.name);

    const formData = new FormData();
    formData.append('transactionFile', file);

    // Show progress
    uploadProgress.style.display = 'block';
    uploadBtn.disabled = true;
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading file...';

    try {
        // Simulate progress
        const progressInterval = setInterval(() => {
            const currentWidth = parseInt(progressFill.style.width) || 0;
            if (currentWidth < 90) {
                progressFill.style.width = (currentWidth + 10) + '%';
            }
        }, 200);

        console.log('Sending request to:', `${API_URL}/upload/upload`);
        const response = await fetch(`${API_URL}/upload/upload`, {
            method: 'POST',
            body: formData
        });

        clearInterval(progressInterval);
        progressFill.style.width = '100%';
        progressText.textContent = 'Processing complete!';

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        const result = await response.json();
        console.log('Upload result:', result);

        if (response.ok) {
            showNotification(`File uploaded successfully! Processed ${result.summary.totalProcessed} transactions with ${result.summary.fraudCount} fraud alerts.`, 'success');
            
            // Reset file upload
            resetFileUpload();
            
            // Reload data
            console.log('Reloading dashboard data...');
            await loadTransactions();
            await loadDashboardStats();
            
            // Show summary
            setTimeout(() => {
                showUploadSummary(result.summary);
            }, 1000);
        } else {
            throw new Error(result.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Upload failed: ' + error.message, 'error');
    } finally {
        setTimeout(() => {
            uploadProgress.style.display = 'none';
            uploadBtn.disabled = false;
        }, 2000);
    }
}

function resetFileUpload() {
    transactionFile.value = '';
    uploadBtn.disabled = true;
    uploadDropZone.innerHTML = `
        <div class="upload-icon">📁</div>
        <p>Drag & drop CSV or TXT file here</p>
        <p>or</p>
        <button type="button" class="btn secondary" id="browse-btn">Browse Files</button>
    `;
}

function showUploadSummary(summary) {
    const summaryHtml = `
        <div class="alert" style="background-color: #d4edda; border-left-color: #28a745; color: #155724;">
            <h4>Upload Summary</h4>
            <p><strong>Total Processed:</strong> ${summary.totalProcessed} transactions</p>
            <p><strong>Fraud Detected:</strong> ${summary.fraudCount} transactions</p>
            <p><strong>Fraud Rate:</strong> ${summary.fraudPercentage.toFixed(2)}%</p>
            <p><strong>Total Amount:</strong> $${summary.totalAmount.toLocaleString()}</p>
        </div>
    `;
    
    // Add to alerts container
    alertsContainer.insertAdjacentHTML('afterbegin', summaryHtml);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        const alert = alertsContainer.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 10000);
}

// Form Submission
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        accountId: document.getElementById('accountId').value,
        amount: parseFloat(document.getElementById('amount').value),
        description: document.getElementById('description').value,
        category: document.getElementById('category').value,
        location: document.getElementById('location').value,
        ipAddress: document.getElementById('ipAddress').value || await getIPAddress(),
        deviceId: document.getElementById('deviceId').value || null,
        browserId: document.getElementById('browserId').value || null,
        recipientAccountId: document.getElementById('recipientAccountId').value || null,
        timestamp: new Date()
    };
    
    try {
        console.log('Sending transaction data:', formData);
        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        console.log('Server response:', result);
        
        if (response.ok) {
            modal.style.display = 'none';
            transactionForm.reset();
            await loadTransactions();
            showNotification('Transaction added successfully', 'success');
        } else {
            throw new Error(result.message || 'Failed to add transaction');
        }
    } catch (error) {
        console.error('Error adding transaction:', error);
        showNotification(error.message, 'error');
    }
});

// Load Transactions
async function loadTransactions() {
    try {
        console.log('Fetching transactions...'); // Debug log
        const response = await fetch(`${API_URL}/transactions`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const transactions = await response.json();
        console.log('Received transactions:', transactions); // Debug log
        
        if (!Array.isArray(transactions)) {
            throw new Error('Invalid response format: expected an array of transactions');
        }
        
        if (transactions.length === 0) {
            transactionsBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center;">No transactions found</td>
                </tr>
            `;
            return;
        }
        
        transactionsBody.innerHTML = transactions.map(transaction => `
            <tr class="${transaction.isFraudulent ? 'fraud' : ''}">
                <td>${transaction.accountId}</td>
                <td>$${transaction.amount.toFixed(2)}</td>
                <td>${transaction.description}</td>
                <td>${transaction.category}</td>
                <td>${transaction.location}</td>
                <td>
                    <span class="status ${transaction.isFraudulent ? 'fraud' : 'safe'}">
                        ${transaction.isFraudulent ? 'Fraudulent' : 'Safe'}
                    </span>
                </td>
                <td>${new Date(transaction.timestamp).toLocaleString()}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading transactions:', error); // Debug log
        showNotification('Error loading transactions: ' + error.message, 'error');
        transactionsBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center;">Error loading transactions</td>
            </tr>
        `;
    }
}

// Update loadDashboardStats function
async function loadDashboardStats() {
    try {
        console.log('Loading dashboard stats from:', `${API_URL}/transactions/stats`);
        const response = await fetch(`${API_URL}/transactions/stats`);
        console.log('Dashboard stats response status:', response.status);
        
        const stats = await response.json();
        console.log('Dashboard stats received:', stats);
        
        // Update summary statistics
        document.getElementById('total-transactions').textContent = stats.totalTransactions;
        document.getElementById('fraudulent-transactions').textContent = stats.fraudulentTransactions;
        document.getElementById('fraud-percentage').textContent = `${stats.fraudulentPercentage.toFixed(2)}%`;
        document.getElementById('total-amount').textContent = `$${stats.totalAmount.toLocaleString()}`;
        
        console.log('Updated dashboard stats:', {
            totalTransactions: stats.totalTransactions,
            fraudulentTransactions: stats.fraudulentTransactions,
            fraudPercentage: stats.fraudulentPercentage,
            totalAmount: stats.totalAmount
        });
        
        // Update risk distribution
        const highRiskCount = stats.riskDistribution?.high || 0;
        const mediumRiskCount = stats.riskDistribution?.medium || 0;
        const lowRiskCount = stats.riskDistribution?.low || 0;
        const totalRisk = highRiskCount + mediumRiskCount + lowRiskCount;

        if (totalRisk > 0) {
            document.getElementById('high-risk-bar').style.width = `${(highRiskCount / totalRisk) * 100}%`;
            document.getElementById('medium-risk-bar').style.width = `${(mediumRiskCount / totalRisk) * 100}%`;
            document.getElementById('low-risk-bar').style.width = `${(lowRiskCount / totalRisk) * 100}%`;
        }

        document.getElementById('high-risk-count').textContent = `${highRiskCount} transactions`;
        document.getElementById('medium-risk-count').textContent = `${mediumRiskCount} transactions`;
        document.getElementById('low-risk-count').textContent = `${lowRiskCount} transactions`;

        // Update recent activity
        const recentActivity = document.getElementById('recent-activity');
        recentActivity.innerHTML = stats.recentTransactions?.map(transaction => `
            <div class="activity-item">
                <div class="activity-icon ${transaction.isFraudulent ? 'fraud' : 'safe'}">
                    ${transaction.isFraudulent ? '⚠️' : '✓'}
                </div>
                <div class="activity-details">
                    <div class="activity-amount">$${transaction.amount.toLocaleString()}</div>
                    <div class="activity-info">${transaction.description}</div>
                    <div class="activity-time">${new Date(transaction.timestamp).toLocaleString()}</div>
                </div>
            </div>
        `).join('') || '';

        // Update location stats
        const locationStats = document.getElementById('location-stats');
        locationStats.innerHTML = stats.topLocations?.map(location => `
            <div class="location-item">
                <span class="location-name">${location.name}</span>
                <span class="location-count">${location.count}</span>
            </div>
        `).join('') || '';

        // Update fraud types chart
        updateFraudTypesChart(stats.flagStats);
        
        // Update time chart
        updateTimeChart(stats.timelineData);
        
        console.log('Dashboard stats update completed');
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Error loading dashboard statistics', 'error');
    }
}

// Add function to update fraud types chart
function updateFraudTypesChart(flagStats) {
    const fraudTypesChart = document.getElementById('fraud-types-chart');
    if (!flagStats || flagStats.length === 0) {
        fraudTypesChart.innerHTML = '<p>No fraud data available</p>';
        return;
    }

    // Create a simple bar chart visualization
    const maxCount = Math.max(...flagStats.map(stat => stat.count));
    const chartHTML = flagStats.map(stat => {
        const percentage = (stat.count / maxCount) * 100;
        const flagName = stat._id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `
            <div class="chart-bar">
                <div class="bar-label">${flagName}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="bar-value">${stat.count}</div>
            </div>
        `;
    }).join('');

    fraudTypesChart.innerHTML = chartHTML;
}

// Add function to update time chart
function updateTimeChart(timelineData) {
    const timeChart = document.getElementById('time-chart');
    // Implementation for time-based visualization
    // You can use a library like Chart.js or D3.js here
}

// Function to get fraud reason explanations
function getFraudReasons(fraudFlags) {
    const reasons = {
        high_value: "Transaction amount exceeds normal threshold (>$10,000)",
        frequency_anomaly: "Too many transactions in a short time period (more than 5 in 1 hour)",
        location_anomaly: "Transaction location or IP address differs from account's usual pattern",
        device_anomaly: "Device or browser ID changed suddenly from previous transactions",
        login_anomaly: "Suspicious login pattern detected (multiple rapid transactions)",
        suspicious_recipient: "Recipient account is flagged as suspicious or contains suspicious keywords",
        circular_transaction: "Circular money flow pattern detected between accounts",
        time_anomaly: "Transaction occurred during unusual hours or deviates from account's normal activity time",
        velocity_anomaly: "Too many actions detected in a short time window",
        statistical_outlier: "Transaction amount significantly deviates from account's normal spending pattern"
    };

    return fraudFlags.map(flag => reasons[flag] || flag).join('\n• ');
}

// Load Fraud Alerts with detailed explanations
async function loadFraudAlerts() {
    try {
        const response = await fetch(`${API_URL}/transactions`);
        const transactions = await response.json();
        
        const fraudulentTransactions = transactions.filter(t => t.isFraudulent);
        
        alertsContainer.innerHTML = fraudulentTransactions.map(transaction => `
            <div class="alert danger">
                <h3>Fraud Alert: Transaction #${transaction._id}</h3>
                <div class="alert-content">
                    <div class="alert-details">
                        <p><strong>Account:</strong> ${transaction.accountId}</p>
                        <p><strong>Amount:</strong> $${transaction.amount.toFixed(2)}</p>
                        <p><strong>Description:</strong> ${transaction.description}</p>
                        <p><strong>Location:</strong> ${transaction.location}</p>
                        <p><strong>Time:</strong> ${new Date(transaction.timestamp).toLocaleString()}</p>
                    </div>
                    <div class="fraud-reasons">
                        <h4>Reasons Flagged as Fraudulent:</h4>
                        <ul>
                            <li>• ${getFraudReasons(transaction.fraudFlags)}</li>
                        </ul>
                    </div>
                    <div class="risk-level">
                        <p><strong>Risk Level:</strong> 
                            <span class="risk-badge ${transaction.fraudFlags.length > 2 ? 'high' : 'medium'}">
                                ${transaction.fraudFlags.length > 2 ? 'High Risk' : 'Medium Risk'}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showNotification('Error loading fraud alerts', 'error');
    }
}

// Search Transactions
transactionSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const rows = transactionsBody.getElementsByTagName('tr');
    
    Array.from(rows).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

// Utility Functions
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return '127.0.0.1'; // Fallback IP
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Load initial data
    loadDashboardStats();
    loadTransactions();
    loadFraudAlerts();
}); 