// routes/insights.js
const express = require('express');
const router = express.Router();
const insightsController = require('../controllers/insights');
const auth = require('../middleware/auth');

// Get all insights for a user
router.get('/', auth, insightsController.getUserInsights);

// Get insights for a specific receipt
router.get('/receipt/:receiptId', auth, insightsController.getReceiptInsights);

// Generate insights for a receipt
router.post('/generate/:receiptId', auth, insightsController.generateInsightsForReceipt);

module.exports = router;