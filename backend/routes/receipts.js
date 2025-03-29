// routes/receipts.js
const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const upload = require('../middleware/upload');
const { authenticateJWT } = require('../middleware/auth');

// Home route - API Info
router.get('/', receiptController.getApiInfo);

// Upload single receipt
router.post('/upload-receipt', authenticateJWT, upload.single('file'), receiptController.uploadReceipt);

// Upload multiple receipts
router.post('/upload-multiple-receipts', authenticateJWT, upload.array('files', 10), receiptController.uploadMultipleReceipts);

// Get all receipts (with filtering)
router.get('/get-receipts', authenticateJWT, receiptController.getReceipts);

// Get receipt by ID
router.get('/get-receipt/:id', authenticateJWT, receiptController.getReceiptById);

// Update receipt currency
router.patch('/update-receipt-currency/:id', authenticateJWT, receiptController.updateReceiptCurrency);

// Get currency statistics
router.get('/currency-stats', authenticateJWT, receiptController.getCurrencyStats);

// Delete receipt by ID
router.delete('/delete-receipt/:id', authenticateJWT, receiptController.deleteReceipt);

// Delete all receipts
router.delete('/delete-all-receipts', authenticateJWT, receiptController.deleteAllReceipts);

// Get receipt analytics
router.get('/receipt-analytics', authenticateJWT, receiptController.getReceiptAnalytics);

// Add manual receipt
router.post('/add-manual-receipt', authenticateJWT, upload.none(), receiptController.addManualReceipt);

module.exports = router;