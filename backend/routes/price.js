const express = require('express');
const router = express.Router();
const priceController = require('../controllers/price');
const auth = require('../middleware/auth');

// Test route to verify route registration
router.get('/test', (req, res) => {
  console.log('[PRICE TEST] Route hit');
  res.json({ message: 'Price routes are working' });
});

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log(`[PRICE ROUTE] ${req.method} ${req.path}`, {
    query: req.query,
    params: req.params,
    body: req.body,
    headers: req.headers,
    url: req.url,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    cookies: req.cookies
  });
  next();
});

// Get price history for an item
router.get('/history', auth, async (req, res) => {
  try {
    console.log('[PRICE HISTORY] Route hit with query:', req.query);
    console.log('[PRICE HISTORY] User:', req.user);
    console.log('[PRICE HISTORY] Headers:', req.headers);
    console.log('[PRICE HISTORY] Cookies:', req.cookies);
    
    if (!req.user) {
      console.log('[PRICE HISTORY] No user found in request');
      return res.status(401).json({ message: 'Unauthorized - Please log in' });
    }
    
    await priceController.getPriceHistory(req, res);
  } catch (error) {
    console.error('[PRICE HISTORY] Error:', error);
    res.status(500).json({ message: 'Error processing price history request', error: error.message });
  }
});

// Compare prices across merchants
router.post('/compare', auth, priceController.comparePrices);

// Get price trends for a category
router.get('/trends', auth, priceController.getCategoryTrends);

// Get best prices for a category
router.get('/best-prices', auth, priceController.getBestPrices);

module.exports = router; 