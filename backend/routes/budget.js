// routes/budget.js
const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget');
const auth = require('../middleware/auth');

// Apply authentication middleware
router.use(auth);

// Get budget configuration
router.get('/', budgetController.getBudgetConfig);

// Get budget analytics
router.get('/analytics', budgetController.getBudgetAnalytics);

// Create or update budget configuration
router.post('/', budgetController.updateBudgetConfig);

// Delete budget category
router.delete('/:category', budgetController.deleteBudgetCategory);

// Reset monthly spending
router.post('/reset', budgetController.resetMonthlySpending);

module.exports = router;