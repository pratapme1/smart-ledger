// models/BudgetConfig.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categoryBudgetSchema = new Schema({
  category: {
    type: String,
    required: true
  },
  monthlyLimit: {
    type: Number,
    required: true,
    min: 0
  },
  currentSpend: {
    type: Number,
    default: 0
  },
  lastNotificationAt: {
    type: Date,
    default: null
  },
  // Track if user has been notified at 80% and 100% 
  notifiedAt80Percent: {
    type: Boolean,
    default: false
  },
  notifiedAt100Percent: {
    type: Boolean,
    default: false
  }
});

const BudgetConfigSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  categoryBudgets: [categoryBudgetSchema],
  lastResetDate: {
    type: Date,
    default: Date.now
  },
  // Enable/disable notifications
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  lastWeeklySummary: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Add method to reset monthly budgets
BudgetConfigSchema.methods.resetMonthlySpending = function() {
  this.categoryBudgets.forEach(budget => {
    budget.currentSpend = 0;
    budget.notifiedAt80Percent = false;
    budget.notifiedAt100Percent = false;
    budget.lastNotificationAt = null;
  });
  this.lastResetDate = Date.now();
  return this.save();
};

// Reset notification flags at the start of each month
BudgetConfigSchema.pre('save', function(next) {
  const now = new Date();
  const lastModified = this.updatedAt || now;
  
  // Check if we've moved to a new month
  if (now.getMonth() !== lastModified.getMonth() || now.getYear() !== lastModified.getYear()) {
    this.categoryBudgets.forEach(budget => {
      budget.notifiedAt80Percent = false;
      budget.notifiedAt100Percent = false;
    });
  }
  next();
});

module.exports = mongoose.model('BudgetConfig', BudgetConfigSchema);