const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { initializeWebSocket } = require('./utils/websocket');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
initializeWebSocket(server);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/fraud', require('./routes/fraudRoutes'));
app.use('/api/upload', require('./routes/fileUploadRoutes'));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/fraudshield', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 