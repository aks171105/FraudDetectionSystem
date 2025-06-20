const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fileUploadController = require('../controllers/fileUploadController');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.csv', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV and TXT files are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Upload file endpoint
router.post('/upload', upload.single('transactionFile'), fileUploadController.uploadFile);

// Get sample file formats
router.get('/sample/:format?', fileUploadController.getSampleFormats);

// Get upload statistics
router.get('/stats', fileUploadController.getUploadStats);

module.exports = router; 