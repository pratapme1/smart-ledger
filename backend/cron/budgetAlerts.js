// cron/budgetAlerts.js
const cron = require('node-cron');
const BudgetConfig = require('../models/BudgetConfig');
const queueService = require('../utils/queueService');

/**
 * Check for budget alerts that need to be sent
 * Runs every day at 9:00 AM
 */
const budgetAlertsJob = cron.schedule('0 9 * * *', async () => {
  console.log('Running budget alerts job', new Date());
  
  try {
    // Get all budget configs with notifications enabled
    const budgetConfigs = await BudgetConfig.find({
      notificationsEnabled: true
    });
    
    for (const config of budgetConfigs) {
      try {
        await checkBudgetAlerts(config);
      } catch (configError) {
        console.error(`Error checking budget alerts for user ${config.userId}:`, configError);
        // Continue with next config
      }
    }
    
    console.log('Budget alerts job completed', new Date());
  } catch (error) {
    console.error('Error in budget alerts job:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

/**
 * Check budget alerts for a specific config
 */
async function checkBudgetAlerts(budgetConfig) {
  const userId = budgetConfig.userId;
  
  // Check each category budget
  for (const budget of budgetConfig.categoryBudgets) {
    const percentUsed = (budget.currentSpend / budget.monthlyLimit) * 100;
    
    // Check if we need to send 80% alert
    if (percentUsed >= 80 && !budget.notifiedAt80Percent) {
      budget.notifiedAt80Percent = true;
      budget.lastNotificationAt = new Date();
      
      // Queue notification
      await queueService.addJob('sendBudgetAlert', {
        userId,
        category: budget.category,
        percentUsed: Math.round(percentUsed),
        threshold: 80,
        spent: budget.currentSpend,
        limit: budget.monthlyLimit
      });
    }
    
    // Check if we need to send 100% alert
    if (percentUsed >= 100 && !budget.notifiedAt100Percent) {
      budget.notifiedAt100Percent = true;
      budget.lastNotificationAt = new Date();
      
      // Queue notification
      await queueService.addJob('sendBudgetAlert', {
        userId,
        category: budget.category,
        percentUsed: Math.round(percentUsed),
        threshold: 100,
        spent: budget.currentSpend,
        limit: budget.monthlyLimit
      });
    }
  }
  
  // Save updated budget config
  await budgetConfig.save();
}

// Start the job if we're in production environment
if (process.env.NODE_ENV === 'production') {
  budgetAlertsJob.start();
  console.log('Budget alerts cron job scheduled');
}

module.exports = {
  budgetAlertsJob,
  checkBudgetAlerts
};