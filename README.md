# FraudShield - Financial Fraud Detection Dashboard

FraudShield is a modern web-based dashboard for real-time financial fraud detection and monitoring. It provides an intuitive interface for tracking transactions, analyzing fraud patterns, and managing fraud alerts.

## Features

- **Real-time Transaction Monitoring**: View and analyze transactions as they occur
- **Fraud Detection Dashboard**: Visual representation of fraud statistics and patterns
- **Risk Distribution Analysis**: Track high, medium, and low-risk transactions
- **Location-based Analysis**: Monitor transaction patterns across different locations
- **Detailed Fraud Alerts**: Comprehensive alerts with fraud detection reasoning
- **Transaction Management**: Add and search transactions with ease
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Tech Stack

- Frontend:
  - HTML5
  - CSS3
  - Vanilla JavaScript
  - Responsive Design with CSS Grid and Flexbox
- Backend:
  - Python Flask API (required)
  - RESTful architecture
  - JSON data format

## Project Structure

```
FraudShield/
├── frontend/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── index.html
├── backend/
│   ├── app.py
│   └── requirements.txt
└── README.md
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fraudshield.git
cd fraudshield
```

2. Set up the backend:
```bash
cd backend
pip install -r requirements.txt
python app.py
```

3. Open the frontend:
- Navigate to the `frontend` directory
- Open `index.html` in a web browser
- Or serve using a local development server

## API Endpoints

The backend API runs on `http://localhost:5000` and provides the following endpoints:

- `GET /api/transactions`: Retrieve all transactions
- `POST /api/transactions`: Add a new transaction
- `GET /api/transactions/stats`: Get dashboard statistics

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
- Focused on user experience and real-time monitoring
- Designed for scalability and maintainability 