// cron/weeklyDigest.js
const cron = require('node-cron');
const moment = require('moment');
const User = require('../models/User');
const Receipt = require('../models/Receipt');
const InsightItem = require('../models/InsightItem');
const BudgetConfig = require('../models/BudgetConfig');
const WeeklyDigest = require('../models/WeeklyDigest');

// Optional services
let gptService;
let queueService;

try {
  gptService = require('../utils/gptService');
} catch (error) {
  console.warn('GPT service not available, using fallback tips');
}

try {
  queueService = require('../utils/queueService');
} catch (error) {
  console.warn('Queue service not available, emails will not be sent');
}

/**
 * Generate and send weekly digests for all users
 * Runs every Sunday at 6:00 AM
 */
const weeklyDigestJob = cron.schedule('0 6 * * 0', async () => {
  console.log('Running weekly digest job', new Date());
  
  try {
    // Get all users
    const users = await User.find({});
    
    for (const user of users) {
      try {
        await generateDigestForUser(user._id);
      } catch (userError) {
        console.error(`Error generating digest for user ${user._id}:`, userError);
        // Continue with next user
      }
    }
    
    console.log('Weekly digest job completed', new Date());
  } catch (error) {
    console.error('Error in weekly digest job:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

/**
 * Generate weekly digest for a specific user
 */
async function generateDigestForUser(userId) {
  // Calculate date range for the past week
  const endDate = moment().endOf('day');
  const startDate = moment().subtract(7, 'days').startOf('day');
  
  try {
    // Get user's receipts for the week
    const receipts = await Receipt.find({
      userId,
      date: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate()
      }
    });
    
    // Calculate total spending
    const totalSpent = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
    
    // Get top spending categories
    const categorySpending = {};
    receipts.forEach(receipt => {
      // First check receipt-level category
      const receiptCategory = receipt.category || 'Uncategorized';
      
      if (!receipt.items || receipt.items.length === 0) {
        // If no items, use receipt total for the receipt category
        categorySpending[receiptCategory] = (categorySpending[receiptCategory] || 0) + receipt.totalAmount;
      } else {
        // Process item-level categories
        receipt.items.forEach(item => {
          // Use item category if available, otherwise use receipt category
          const category = item.category || receiptCategory;
          const itemTotal = (item.price || 0) * (item.quantity || 1);
          categorySpending[category] = (categorySpending[category] || 0) + itemTotal;
        });
      }
    });
    
    // Convert category spending to array and calculate percentages
    const topCategories = Object.entries(categorySpending)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    
    // Get budget alerts with proper category mapping
    const budgetConfig = await BudgetConfig.findOne({ userId });
    const budgetAlerts = [];
    
    if (budgetConfig && budgetConfig.categoryLimits) {
      const categoryLimits = budgetConfig.categoryLimits || {};
      for (const [category, limit] of Object.entries(categoryLimits)) {
        const spent = categorySpending[category] || 0;
        if (spent > limit) {
          budgetAlerts.push({
            category,
            spent,
            limit,
            overspent: spent - limit
          });
        }
      }
    }
    
    // Get recurring purchase alerts with proper category mapping
    const recurringAlerts = [];
    const insightItems = await InsightItem.find({ userId });
    
    insightItems.forEach(item => {
      if (item.isRecurring && item.frequency === 'weekly') {
        const similarItems = receipts.filter(receipt => 
          receipt.items.some(i => 
            i.name.toLowerCase().includes(item.itemName.toLowerCase())
          )
        );
        
        if (similarItems.length > 0) {
          const category = item.category || similarItems[0].category || 'Uncategorized';
          recurringAlerts.push({
            item: item.itemName,
            category,
            frequency: item.frequency,
            suggestion: 'Consider if this is a necessary recurring expense'
          });
        }
      }
    });
    
    // Generate weekly tip with category context
    let weeklyTip;
    if (gptService) {
      try {
        weeklyTip = await gptService.generateWeeklyTip(topCategories, totalSpent, recurringAlerts);
      } catch (error) {
        console.error('Error generating GPT tip:', error);
        weeklyTip = 'Track your daily expenses to identify unnecessary spending.';
      }
    } else {
      weeklyTip = 'Track your daily expenses to identify unnecessary spending.';
    }
    
    // Create digest document
    const digest = new WeeklyDigest({
      userId,
      weekStartDate: startDate.toDate(),
      weekEndDate: endDate.toDate(),
      totalSpent,
      topCategories,
      budgetAlerts,
      recurringAlerts,
      weeklyTip,
      currency: receipts[0]?.currency || 'INR' // Use first receipt's currency or default to INR
    });
    
    await digest.save();
    
    // Queue email notification if queue service is available
    if (queueService) {
      try {
        await queueService.addJob('sendWeeklyDigest', {
          userId,
          digestId: digest._id
        });
      } catch (error) {
        console.error('Error queueing email notification:', error);
      }
    }
    
    return digest;
  } catch (error) {
    console.error('Error generating digest for user:', error);
    throw error;
  }
}

// Start the job if we're in production environment
if (process.env.NODE_ENV === 'production') {
  weeklyDigestJob.start();
  console.log('Weekly digest cron job scheduled');
}

module.exports = {
  weeklyDigestJob,
  generateDigestForUser
};