const fs = require('fs');
const path = require('path');

class FileParser {
    constructor() {
        this.supportedFormats = ['.csv', '.txt'];
    }

    /**
     * Parse uploaded file and extract transaction data
     * @param {Object} file - Multer file object
     * @returns {Array} Array of transaction objects
     */
    async parseFile(file) {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (!this.supportedFormats.includes(fileExtension)) {
            throw new Error(`Unsupported file format. Supported formats: ${this.supportedFormats.join(', ')}`);
        }

        const fileContent = fs.readFileSync(file.path, 'utf8');
        
        if (fileExtension === '.csv') {
            return this.parseCSV(fileContent);
        } else if (fileExtension === '.txt') {
            return this.parseTXT(fileContent);
        }
    }

    /**
     * Parse CSV file content
     * @param {string} content - CSV file content
     * @returns {Array} Array of transaction objects
     */
    parseCSV(content) {
        const lines = content.trim().split('\n');
        const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
        
        const transactions = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            const transaction = this.createTransactionObject(headers, values);
            
            if (transaction) {
                transactions.push(transaction);
            }
        }
        
        return transactions;
    }

    /**
     * Parse TXT file content (tab-separated or space-separated)
     * @param {string} content - TXT file content
     * @returns {Array} Array of transaction objects
     */
    parseTXT(content) {
        const lines = content.trim().split('\n');
        const transactions = [];
        
        // Try to detect separator (tab or space)
        const firstLine = lines[0];
        const isTabSeparated = firstLine.includes('\t');
        const separator = isTabSeparated ? '\t' : ' ';
        
        // Extract headers from first line
        const headers = firstLine.split(separator).map(header => header.trim().toLowerCase());
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(separator).map(value => value.trim());
            const transaction = this.createTransactionObject(headers, values);
            
            if (transaction) {
                transactions.push(transaction);
            }
        }
        
        return transactions;
    }

    /**
     * Parse CSV line handling quoted values
     * @param {string} line - CSV line
     * @returns {Array} Array of values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    /**
     * Create transaction object from headers and values
     * @param {Array} headers - Column headers
     * @param {Array} values - Row values
     * @returns {Object|null} Transaction object or null if invalid
     */
    createTransactionObject(headers, values) {
        if (headers.length !== values.length) {
            return null;
        }

        const transaction = {};
        
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            let value = values[i];
            
            // Map common header variations
            const headerMapping = {
                'accountid': 'accountId',
                'account_id': 'accountId',
                'account': 'accountId',
                'amt': 'amount',
                'value': 'amount',
                'desc': 'description',
                'descrip': 'description',
                'cat': 'category',
                'type': 'category',
                'loc': 'location',
                'place': 'location',
                'ip': 'ipAddress',
                'ipaddress': 'ipAddress',
                'ip_address': 'ipAddress',
                'date': 'timestamp',
                'time': 'timestamp',
                'datetime': 'timestamp'
            };
            
            const mappedHeader = headerMapping[header] || header;
            
            // Convert value based on field type
            if (mappedHeader === 'amount') {
                value = parseFloat(value) || 0;
            } else if (mappedHeader === 'timestamp') {
                value = this.parseTimestamp(value);
            } else if (mappedHeader === 'isFraudulent') {
                value = this.parseBoolean(value);
            }
            
            transaction[mappedHeader] = value;
        }
        
        // Validate required fields
        if (!transaction.accountId || !transaction.amount) {
            return null;
        }
        
        // Set default values for missing fields
        if (!transaction.description) {
            transaction.description = 'Transaction from file upload';
        }
        if (!transaction.category) {
            transaction.category = 'purchase';
        }
        if (!transaction.location) {
            transaction.location = 'Unknown';
        }
        if (!transaction.ipAddress) {
            transaction.ipAddress = '127.0.0.1';
        }
        if (!transaction.timestamp) {
            transaction.timestamp = new Date();
        }
        // Add default values for fraud detection fields if missing
        if (!transaction.recipientAccountId) {
            transaction.recipientAccountId = null;
        }
        if (!transaction.deviceId) {
            transaction.deviceId = null;
        }
        if (!transaction.browserId) {
            transaction.browserId = null;
        }
        return transaction;
    }

    /**
     * Parse timestamp string to Date object
     * @param {string} timestamp - Timestamp string
     * @returns {Date} Date object
     */
    parseTimestamp(timestamp) {
        if (!timestamp) return new Date();
        // Try different timestamp formats
        const formats = [
            /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
            /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
            /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // YYYY-MM-DD HH:MM:SS
            /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/, // MM/DD/YYYY HH:MM:SS
            /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
            /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/, // DD-MM-YYYY HH:mm
        ];
        for (const format of formats) {
            if (format.test(timestamp)) {
                // Handle DD-MM-YYYY and DD-MM-YYYY HH:mm
                if (/^\d{2}-\d{2}-\d{4}( \d{2}:\d{2})?$/.test(timestamp)) {
                    const [datePart, timePart] = timestamp.split(' ');
                    const [day, month, year] = datePart.split('-').map(Number);
                    if (timePart) {
                        const [hour, minute] = timePart.split(':').map(Number);
                        return new Date(year, month - 1, day, hour, minute);
                    } else {
                        return new Date(year, month - 1, day);
                    }
                }
                // Default: let JS parse
                return new Date(timestamp);
            }
        }
        // If no format matches, try parsing as ISO string
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? new Date() : date;
    }

    /**
     * Parse boolean string to boolean
     * @param {string} value - Boolean string
     * @returns {boolean} Boolean value
     */
    parseBoolean(value) {
        if (!value) return false;
        
        const trueValues = ['true', '1', 'yes', 'y', 'fraudulent'];
        const falseValues = ['false', '0', 'no', 'n', 'legitimate'];
        
        const lowerValue = value.toLowerCase();
        
        if (trueValues.includes(lowerValue)) {
            return true;
        } else if (falseValues.includes(lowerValue)) {
            return false;
        }
        
        return false;
    }

    /**
     * Get sample CSV format for user reference
     * @returns {string} Sample CSV content
     */
    getSampleCSV() {
        return `accountId,amount,description,category,location,ipAddress,timestamp
ACC001,1500.50,Grocery purchase,purchase,New York,192.168.1.1,2024-01-15 10:30:00
ACC002,2500.75,Online transfer,transfer,Los Angeles,192.168.1.2,2024-01-15 11:45:00
ACC003,500.25,ATM withdrawal,withdrawal,Chicago,192.168.1.3,2024-01-15 12:15:00`;
    }

    /**
     * Get sample TXT format for user reference
     * @returns {string} Sample TXT content
     */
    getSampleTXT() {
        return `accountId	amount	description	category	location	ipAddress	timestamp
ACC001	1500.50	Grocery purchase	purchase	New York	192.168.1.1	2024-01-15 10:30:00
ACC002	2500.75	Online transfer	transfer	Los Angeles	192.168.1.2	2024-01-15 11:45:00
ACC003	500.25	ATM withdrawal	withdrawal	Chicago	192.168.1.3	2024-01-15 12:15:00`;
    }
}

module.exports = new FileParser(); 