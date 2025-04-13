// cron/recurringDetection.js
const cron = require('node-cron');
const moment = require('moment');
const Receipt = require('../models/Receipt');
const InsightItem = require('../models/InsightItem');
const User = require('../models/User');

/**
 * Detect recurring purchases across all users
 * Runs daily at 2:00 AM
 */
const recurringDetectionJob = cron.schedule('0 2 * * *', async () => {
  console.log('Running recurring purchase detection job', new Date());
  
  try {
    // Get all users
    const users = await User.find({});
    
    for (const user of users) {
      try {
        await detectRecurringPurchases(user._id);
      } catch (userError) {
        console.error(`Error detecting recurring purchases for user ${user._id}:`, userError);
        // Continue with next user
      }
    }
    
    console.log('Recurring purchase detection job completed', new Date());
  } catch (error) {
    console.error('Error in recurring purchase detection job:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

/**
 * Detect recurring purchases for a specific user
 */
async function detectRecurringPurchases(userId) {
  // Look at purchases in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Get all receipts in the last 30 days
  const receipts = await Receipt.find({
    userId,
    date: { $gte: thirtyDaysAgo }
  });
  
  if (receipts.length < 2) {
    // Not enough receipts to detect patterns
    return;
  }
  
  // Extract all items
  const allItems = [];
  receipts.forEach(receipt => {
    receipt.items.forEach(item => {
      allItems.push({
        name: item.name,
        price: item.price,
        receiptId: receipt._id,
        date: receipt.date
      });
    });
  });
  
  // Create a map to group similar items
  const itemGroups = {};
  
  // Simple similarity detection (can be improved with more sophisticated algorithms)
  allItems.forEach(item => {
    const normalizedName = item.name.toLowerCase().trim();
    
    // Try to find a match in existing groups
    let matched = false;
    
    for (const groupKey in itemGroups) {
      // Simple check: if one contains the other, consider it a match
      if (groupKey.includes(normalizedName) || normalizedName.includes(groupKey)) {
        itemGroups[groupKey].push(item);
        matched = true;
        break;
      }
    }
    
    // If no match, create a new group
    if (!matched) {
      itemGroups[normalizedName] = [item];
    }
  });
  
  // Find groups with 2 or more purchases
  const recurringGroups = Object.entries(itemGroups)
    .filter(([_, items]) => items.length >= 2);
  
  // Update receipt items and create insight items for recurring purchases
  for (const [groupName, items] of recurringGroups) {
    // Sort by date
    items.sort((a, b) => a.date - b.date);
    
    // Check if this is already marked as recurring
    const existingInsight = await InsightItem.findOne({
      userId,
      itemName: { $regex: new RegExp(groupName, 'i') },
      isRecurring: true
    });
    
    if (!existingInsight) {
      // Create a new insight for this recurring purchase
      // Use the most recent item in the group
      const mostRecentItem = items[items.length - 1];
      
      // Generate a suggestion based on frequency
      const timeSpan = moment(items[items.length - 1].date).diff(moment(items[0].date), 'days');
      const frequency = items.length / (timeSpan / 30);
      let suggestion = '';
      
      if (frequency >= 4) {
        suggestion = `You buy this ${Math.round(frequency)} times per month. Consider a bulk purchase or subscription for savings.`;
      } else {
        suggestion = `This is a recurring expense. Check if there are better deals or alternatives.`;
      }
      
      // Create insight item
      await InsightItem.create({
        userId,
        itemName: mostRecentItem.name,
        category: 'recurring', // Can be updated later
        detectedPrice: mostRecentItem.price,
        receiptId: mostRecentItem.receiptId,
        insightText: suggestion,
        isRecurring: true,
        processingStatus: 'completed'
      });
      
      // Update receipt item to mark as recurring
      await Receipt.updateOne(
        { _id: mostRecentItem.receiptId, 'items.name': mostRecentItem.name },
        { $set: { 'items.$.isRecurring': true } }
      );
    }
  }
}

// Start the job if we're in production environment
if (process.env.NODE_ENV === 'production') {
  recurringDetectionJob.start();
  console.log('Recurring purchase detection cron job scheduled');
}

module.exports = {
  recurringDetectionJob,
  detectRecurringPurchases
};