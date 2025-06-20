# FraudShield - Financial Fraud Detection System

FraudShield is a comprehensive financial fraud detection system that uses multiple algorithms and techniques to identify potentially fraudulent transactions. The system provides a user-friendly dashboard for monitoring transactions and fraud alerts in real-time, with support for both individual transaction entry and bulk file uploads.

## Features

- Real-time transaction monitoring
- **Bulk transaction upload via CSV/TXT files**
- Multiple fraud detection algorithms:
  - Threshold-based anomaly detection
  - Statistical analysis (Z-Score)
  - Pattern matching
  - Time-based analysis
  - Geo-location heuristics
  - Graph analysis
  - Clustering analysis
  - Network analysis
- Interactive dashboard with statistics
- Transaction management system
- Fraud alerts and notifications
- Responsive design
- **Drag & drop file upload interface**
- **Sample file format templates**

## Tech Stack

- Frontend:
  - HTML5
  - CSS3
  - Vanilla JavaScript
- Backend:
  - Node.js
  - Express.js
  - MongoDB
  - **Multer (file upload handling)**
- Additional Tools:
  - CORS for cross-origin requests
  - Body-parser for request parsing
  - Mongoose for MongoDB object modeling

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Web browser (Chrome, Firefox, Safari, or Edge)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fraudshield.git
cd fraudshield
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Create a `.env` file in the backend directory with the following content:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fraudDetection
```

4. Start MongoDB service on your system

5. Start the backend server:
```bash
npm start
```

6. Open the frontend:
- Navigate to the `frontend` directory
- Open `index.html` in your web browser
- Or use a local server like `live-server`:
  ```bash
  npx live-server frontend
  ```

## Usage

### Dashboard
- View overall statistics
- Monitor fraud detection rates
- Analyze fraud patterns

### Transactions
- **Bulk Upload**: Upload CSV or TXT files with multiple transactions
- Add individual transactions manually
- View transaction history
- Search and filter transactions
- Check transaction status

### File Upload Format

#### CSV Format
```csv
accountId,amount,description,category,location,ipAddress,timestamp
ACC001,1500.50,Grocery purchase,purchase,New York,192.168.1.1,2024-01-15 10:30:00
ACC002,2500.75,Online transfer,transfer,Los Angeles,192.168.1.2,2024-01-15 11:45:00
```

#### TXT Format (Tab-separated)
```
accountId	amount	description	category	location	ipAddress	timestamp
ACC001	1500.50	Grocery purchase	purchase	New York	192.168.1.1	2024-01-15 10:30:00
ACC002	2500.75	Online transfer	transfer	Los Angeles	192.168.1.2	2024-01-15 11:45:00
```

#### Required Fields
- `accountId` (required): Unique identifier for the account
- `amount` (required): Transaction amount (numeric)

#### Optional Fields
- `description`: Transaction description
- `category`: Transaction category (purchase, transfer, withdrawal, deposit)
- `location`: Transaction location
- `ipAddress`: IP address associated with the transaction
- `timestamp`: Transaction timestamp (if not provided, current time is used)

### Fraud Alerts
- View detected fraudulent transactions
- Check fraud detection flags
- Monitor suspicious patterns

## Fraud Detection Algorithms

1. **Threshold-based Anomalies**:
   - Detects high-value transactions (>$10,000)
   - Monitors transaction frequency

2. **Statistical Methods**:
   - Z-Score analysis for outlier detection
   - Moving average analysis

3. **Pattern Matching**:
   - Keyword-based detection
   - Rabin-Karp algorithm implementation

4. **Time-based Analysis**:
   - Detects rapid successive transactions
   - Analyzes transaction timing patterns

5. **Geo-location Analysis**:
   - Checks for geographical anomalies
   - Monitors location-based patterns

6. **Graph Analysis**:
   - Detects circular transaction patterns
   - Analyzes transaction networks

7. **Clustering**:
   - Groups similar transactions
   - Identifies outlier behavior

8. **Network Analysis**:
   - Floyd-Warshall algorithm implementation
   - Analyzes transaction connectivity

## File Upload Features

- **Supported Formats**: CSV and TXT files
- **File Size Limit**: 10MB
- **Drag & Drop Interface**: Easy file selection
- **Progress Tracking**: Real-time upload progress
- **Error Handling**: Comprehensive error messages
- **Sample Templates**: Built-in format examples
- **Bulk Processing**: Process multiple transactions simultaneously
- **Fraud Detection**: Automatic fraud analysis for uploaded transactions

## API Endpoints

### File Upload
- `POST /api/upload/upload` - Upload and process transaction file
- `GET /api/upload/sample/:format` - Get sample file format
- `GET /api/upload/stats` - Get upload statistics

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/stats` - Get transaction statistics
- `GET /api/transactions/:id` - Get specific transaction
- `GET /api/transactions/account/:accountId` - Get account transactions

### Fraud Detection
- `GET /api/fraud/alerts` - Get fraud alerts
- `POST /api/fraud/analyze` - Analyze transaction for fraud

## Sample Files

The project includes sample files for testing:
- `sample_transactions.csv` - Sample CSV file with 15 transactions
- `sample_transactions.txt` - Sample TXT file with 10 transactions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with modern web technologies
- Implements industry-standard fraud detection techniques
- Uses efficient algorithms for real-time analysis
- Supports bulk data processing for enterprise use cases 