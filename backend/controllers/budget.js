// controllers/budget.js
const BudgetConfig = require('../models/BudgetConfig');
const InsightItem = require('../models/InsightItem');
const Receipt = require('../models/Receipt');
const mongoose = require('mongoose');
const NotificationService = require('../services/notificationService');

// Get budget configuration for a user
exports.getBudgetConfig = async (req, res) => {
  try {
    const userId = req.user._id;
    
    let budgetConfig = await BudgetConfig.findOne({ userId });
    
    if (!budgetConfig) {
      // Create default budget config if none exists
      budgetConfig = new BudgetConfig({
        userId,
        categoryBudgets: [],
        notificationsEnabled: true
      });
      await budgetConfig.save();
    }
    
    res.json(budgetConfig);
  } catch (error) {
    console.error('Error fetching budget config:', error);
    res.status(500).json({
      message: 'Failed to fetch budget configuration',
      error: error.message
    });
  }
};

// Create or update budget configuration
exports.updateBudgetConfig = async (req, res) => {
  try {
    const { categoryBudgets, notificationsEnabled } = req.body;
    const userId = req.user._id;
    
    // Validate input
    if (!Array.isArray(categoryBudgets)) {
      return res.status(400).json({
        message: 'Invalid categoryBudgets format. Should be an array.'
      });
    }
    
    // Find existing config or create new one
    let budgetConfig = await BudgetConfig.findOne({ userId });
    
    if (!budgetConfig) {
      budgetConfig = new BudgetConfig({
        userId,
        categoryBudgets: [],
        notificationsEnabled: true
      });
    }
    
    // Update notification preferences
    if (notificationsEnabled !== undefined) {
      budgetConfig.notificationsEnabled = notificationsEnabled;
    }
    
    // Process each category budget
    for (const newBudget of categoryBudgets) {
      const { category, monthlyLimit } = newBudget;
      
      if (!category || typeof monthlyLimit !== 'number' || monthlyLimit < 0) {
        return res.status(400).json({
          message: 'Invalid budget configuration. Category and positive monthlyLimit required.'
        });
      }
      
      // Find if this category already exists
      const existingBudgetIndex = budgetConfig.categoryBudgets.findIndex(
        b => b.category.toLowerCase() === category.toLowerCase()
      );
      
      if (existingBudgetIndex >= 0) {
        // Update existing budget
        budgetConfig.categoryBudgets[existingBudgetIndex].monthlyLimit = monthlyLimit;
      } else {
        // Add new budget
        budgetConfig.categoryBudgets.push({
          category,
          monthlyLimit,
          currentSpend: 0
        });
      }
    }
    
    // Save updated config
    await budgetConfig.save();
    
    res.json({
      message: 'Budget configuration updated successfully',
      budgetConfig
    });
  } catch (error) {
    console.error('Error updating budget config:', error);
    res.status(500).json({
      message: 'Failed to update budget configuration',
      error: error.message
    });
  }
};

// Delete a budget category
exports.deleteBudgetCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user._id;
    
    const budgetConfig = await BudgetConfig.findOne({ userId });
    
    if (!budgetConfig) {
      return res.status(404).json({ message: 'Budget configuration not found' });
    }
    
    // Remove the specified category
    budgetConfig.categoryBudgets = budgetConfig.categoryBudgets.filter(
      budget => budget.category.toLowerCase() !== category.toLowerCase()
    );
    
    await budgetConfig.save();
    
    res.json({
      message: `Budget category "${category}" deleted successfully`,
      budgetConfig
    });
  } catch (error) {
    console.error('Error deleting budget category:', error);
    res.status(500).json({
      message: 'Failed to delete budget category',
      error: error.message
    });
  }
};

// Get budget analytics
exports.getBudgetAnalytics = async (req, res) => {
  console.log('Budget analytics requested for user:', req.user?._id);
  try {
    const userId = req.user._id;
    
    const budgetConfig = await BudgetConfig.findOne({ userId });
    console.log('Found budget config:', budgetConfig ? 'Yes' : 'No');
    
    if (!budgetConfig) {
      return res.status(404).json({ message: 'No budget configuration found' });
    }
    
    // Calculate current month spending by category
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month
    currentMonth.setHours(0, 0, 0, 0);
    
    // Get spending from InsightItems
    const insightSpending = await InsightItem.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId.toString()),
          dateDetected: { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: '$category',
          totalSpent: { $sum: '$detectedPrice' }
        }
      }
    ]);
    
    // Get spending from Receipts
    const receipts = await Receipt.find({
      userId: new mongoose.Types.ObjectId(userId.toString()),
      date: { $gte: currentMonth }
    });
    
    // Process receipt spending
    const receiptSpending = {};
    receipts.forEach(receipt => {
      // Handle receipt-level category first
      const receiptCategory = receipt.category || 'Uncategorized';
      
      if (!receipt.items || receipt.items.length === 0) {
        // If no items, use receipt total for the receipt category
        receiptSpending[receiptCategory] = (receiptSpending[receiptCategory] || 0) + receipt.totalAmount;
      } else {
        // Process item-level categories
        receipt.items.forEach(item => {
          // Use item category if available, otherwise use receipt category
          const category = item.category || receiptCategory;
          const itemTotal = (item.price || 0) * (item.quantity || 1);
          receiptSpending[category] = (receiptSpending[category] || 0) + itemTotal;
        });
      }
    });
    
    // Combine spending data from both sources
    const categorySpending = {};
    let totalSpent = 0;
    
    // Add insight spending
    insightSpending.forEach(insight => {
      const category = insight._id || 'Uncategorized';
      categorySpending[category] = (categorySpending[category] || 0) + insight.totalSpent;
      totalSpent += insight.totalSpent;
    });
    
    // Add receipt spending
    Object.entries(receiptSpending).forEach(([category, amount]) => {
      categorySpending[category] = (categorySpending[category] || 0) + amount;
      totalSpent += amount;
    });
    
    // Format the response with budget progress
    const budgetProgress = budgetConfig.categoryBudgets.map(budget => {
      const spent = categorySpending[budget.category] || 0;
      const percentUsed = budget.monthlyLimit > 0 
        ? Math.min(100, Math.round((spent / budget.monthlyLimit) * 100)) 
        : 0;
      
      // Check if we need to send notifications
      if (budgetConfig.notificationsEnabled) {
        // Send notification at 80% if not already notified
        if (percentUsed >= 80 && !budget.notifiedAt80Percent) {
          NotificationService.sendBudgetAlert(
            userId,
            budget.category,
            percentUsed,
            spent,
            budget.monthlyLimit
          );
          budget.notifiedAt80Percent = true;
        }
        
        // Send notification at 100% if not already notified
        if (percentUsed >= 100 && !budget.notifiedAt100Percent) {
          NotificationService.sendBudgetAlert(
            userId,
            budget.category,
            percentUsed,
            spent,
            budget.monthlyLimit
          );
          budget.notifiedAt100Percent = true;
        }
      }
        
      return {
        category: budget.category,
        monthlyLimit: budget.monthlyLimit,
        spent,
        percentUsed,
        status: percentUsed >= 100 ? 'exceeded' : percentUsed >= 80 ? 'warning' : 'normal'
      };
    });
    
    // Add uncategorized spending if it exists
    if (categorySpending['Uncategorized'] && !budgetConfig.categoryBudgets.find(b => b.category === 'Uncategorized')) {
      budgetProgress.push({
        category: 'Uncategorized',
        monthlyLimit: 0,
        spent: categorySpending['Uncategorized'],
        percentUsed: 100,
        status: 'warning'
      });
    }

    // Save notification status updates
    if (budgetConfig.isModified()) {
      await budgetConfig.save();
    }

    // Send weekly summary if it's Sunday and hasn't been sent this week
    const today = new Date();
    if (today.getDay() === 0 && // Sunday
        (!budgetConfig.lastWeeklySummary || 
         today - new Date(budgetConfig.lastWeeklySummary) > 7 * 24 * 60 * 60 * 1000)) {
      
      NotificationService.sendWeeklySummary(userId, {
        totalSpent,
        budgetProgress
      });
      
      budgetConfig.lastWeeklySummary = today;
      await budgetConfig.save();
    }
    
    res.json({
      budgetProgress,
      notificationsEnabled: budgetConfig.notificationsEnabled,
      totalSpent
    });
  } catch (error) {
    console.error('Error fetching budget analytics:', error);
    res.status(500).json({
      message: 'Failed to fetch budget analytics',
      error: error.message
    });
  }
};

// Reset monthly spending
exports.resetMonthlySpending = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const budgetConfig = await BudgetConfig.findOne({ userId });
    
    if (!budgetConfig) {
      return res.status(404).json({ message: 'Budget configuration not found' });
    }
    
    // Reset all category spending
    budgetConfig.categoryBudgets.forEach(budget => {
      budget.currentSpend = 0;
      budget.notifiedAt80Percent = false;
      budget.notifiedAt100Percent = false;
    });
    
    budgetConfig.lastResetDate = new Date();
    await budgetConfig.save();
    
    res.json({
      message: 'Monthly spending reset successfully',
      budgetConfig
    });
  } catch (error) {
    console.error('Error resetting monthly spending:', error);
    res.status(500).json({
      message: 'Failed to reset monthly spending',
      error: error.message
    });
  }
};

module.exports = exports;