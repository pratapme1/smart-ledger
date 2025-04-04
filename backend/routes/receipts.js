// routes/receipts.js
const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');

// Home route - API Info
router.get('/', receiptController.getApiInfo);

// Upload single receipt
router.post('/upload-receipt', auth, upload.single('file'), receiptController.uploadReceipt);

// Upload multiple receipts
router.post('/upload-multiple-receipts', auth, upload.array('files', 10), receiptController.uploadMultipleReceipts);

// Get all receipts (with filtering)
router.get('/get-receipts', auth, receiptController.getReceipts);

// Get receipt by ID
router.get('/get-receipt/:id', auth, receiptController.getReceiptById);

// Update receipt currency
router.patch('/update-receipt-currency/:id', auth, receiptController.updateReceiptCurrency);

// Get currency statistics
router.get('/currency-stats', auth, receiptController.getCurrencyStats);

// Delete receipt by ID
router.delete('/delete-receipt/:id', auth, receiptController.deleteReceipt);

// Delete all receipts
router.delete('/delete-all-receipts', auth, receiptController.deleteAllReceipts);

// Get receipt analytics
router.get('/receipt-analytics', auth, receiptController.getReceiptAnalytics);

// Add manual receipt
router.post('/add-manual-receipt', auth, upload.none(), receiptController.addManualReceipt);

module.exports = router;