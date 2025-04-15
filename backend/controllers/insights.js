// controllers/insights.js
const Receipt = require('../models/Receipt');
const InsightItem = require('../models/InsightItem');
const BudgetConfig = require('../models/BudgetConfig');
const gptService = require('../utils/gptService');
const queueService = require('../utils/queueService');

// Local fallback categories if GPT is unavailable
const FALLBACK_CATEGORIES = {
  'milk': 'groceries',
  'bread': 'groceries',
  'pizza': 'dining',
  'restaurant': 'dining',
  'uber': 'transportation',
  'lyft': 'transportation',
  'phone': 'utilities',
  'netflix': 'entertainment',
  'movie': 'entertainment',
  'amazon': 'shopping',
  'medicine': 'healthcare',
  'doctor': 'healthcare',
  // Add more keywords as needed
};

/**
 * Generate insights for a newly uploaded receipt
 */
exports.generateInsightsForReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = req.user._id;

    // Find the receipt
    const receipt = await Receipt.findOne({ 
      _id: receiptId, 
      userId 
    });

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    // If insights already processed, return them
    if (receipt.hasProcessedInsights) {
      return res.status(200).json({ 
        message: 'Insights already processed for this receipt',
        receipt
      });
    }

    // Add this job to the queue for processing
    await queueService.addJob('processReceiptInsights', {
      receiptId: receipt._id,
      userId
    });

    // Update receipt status
    receipt.insightProcessingStatus = 'processing';
    await receipt.save();

    res.status(202).json({
      message: 'Receipt insights processing has been queued',
      receiptId: receipt._id
    });
  } catch (error) {
    console.error('Error queueing receipt insights:', error);
    res.status(500).json({
      message: 'Failed to generate insights',
      error: error.message
    });
  }
};

/**
 * Worker function to process receipt insights (called by queue)
 */
exports.processReceiptInsights = async (job) => {
  const { receiptId, userId } = job.data;
  
  try {
    const receipt = await Receipt.findById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    // Mark as processing
    receipt.insightProcessingStatus = 'processing';
    await receipt.save();

    // Process each item
    const updatedItems = [];
    
    for (const item of receipt.items) {
      try {
        // 1. Categorize item
        const category = await categorizeItem(item.name);
        
        // 2. Check for recurring purchases
        const isRecurring = await checkForRecurringPurchase(userId, item.name);
        
        // 3. Generate GPT insight if possible
        let gptInsight = null;
        try {
          gptInsight = await gptService.generateItemInsight({
            itemName: item.name,
            price: item.price,
            category,
            isRecurring
          });
        } catch (gptError) {
          console.error('Error generating GPT insight:', gptError);
          // Fallback to template-based insight
          gptInsight = generateFallbackInsight({
            itemName: item.name,
            price: item.price,
            isRecurring
          });
        }
        
        // 4. Update item with gathered insights
        const updatedItem = {
          ...item,
          category,
          isRecurring,
          gptInsight
        };
        
        updatedItems.push(updatedItem);
        
        // 5. Create insight item record
        await InsightItem.create({
          userId,
          itemName: item.name,
          category,
          detectedPrice: item.price,
          receiptId,
          insightText: gptInsight,
          isRecurring,
          processingStatus: 'completed'
        });
        
        // 6. Update budget if needed
        await updateBudgetForCategory(userId, category, item.price);
        
      } catch (itemError) {
        console.error(`Error processing item ${item.name}:`, itemError);
        // Add the item without insights if there's an error
        updatedItems.push(item);
      }
    }
    
    // Update receipt with processed items
    receipt.items = updatedItems;
    receipt.hasProcessedInsights = true;
    receipt.insightProcessingStatus = 'completed';
    await receipt.save();
    
    return { success: true, receiptId };
    
  } catch (error) {
    console.error('Error processing receipt insights:', error);
    
    // Update receipt status to failed
    try {
      await Receipt.findByIdAndUpdate(receiptId, {
        insightProcessingStatus: 'failed'
      });
    } catch (updateError) {
      console.error('Failed to update receipt status:', updateError);
    }
    
    throw error;
  }
};

/**
 * Categorize an item using GPT with fallback to local keyword mapping
 */
async function categorizeItem(itemName) {
  try {
    // Try GPT categorization first
    const category = await gptService.categorizeItem(itemName);
    return category.toLowerCase();
  } catch (error) {
    console.error('GPT categorization failed, using fallback:', error);
    
    // Fallback to keyword-based categorization
    const lowerCaseItem = itemName.toLowerCase();
    
    for (const [keyword, category] of Object.entries(FALLBACK_CATEGORIES)) {
      if (lowerCaseItem.includes(keyword)) {
        return category;
      }
    }
    
    // Default category if no match found
    return 'other';
  }
}

/**
 * Check if this purchase has occurred before (recurring)
 */
async function checkForRecurringPurchase(userId, itemName) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Find similar items in the past 30 days
  const similarItems = await InsightItem.find({
    userId,
    itemName: { $regex: new RegExp(itemName, 'i') },
    dateDetected: { $gte: thirtyDaysAgo }
  }).count();
  
  // If there are 2 or more similar items in the past 30 days, mark as recurring
  return similarItems >= 2;
}

/**
 * Update user's budget for a specific category
 */
async function updateBudgetForCategory(userId, category, amount) {
  const budgetConfig = await BudgetConfig.findOne({ userId });
  
  if (!budgetConfig) {
    // No budget configured, nothing to update
    return null;
  }
  
  const categoryBudget = budgetConfig.categoryBudgets.find(
    b => b.category.toLowerCase() === category.toLowerCase()
  );
  
  if (!categoryBudget) {
    // No budget for this category
    return null;
  }
  
  // Update current spend for this category
  categoryBudget.currentSpend += amount;
  
  // Check if we need to send notifications
  if (budgetConfig.notificationsEnabled) {
    const percentUsed = (categoryBudget.currentSpend / categoryBudget.monthlyLimit) * 100;
    
    // 80% threshold notification
    if (percentUsed >= 80 && !categoryBudget.notifiedAt80Percent) {
      categoryBudget.notifiedAt80Percent = true;
      categoryBudget.lastNotificationAt = new Date();
      
      // Queue notification
      await queueService.addJob('sendBudgetAlert', {
        userId,
        category,
        percentUsed: Math.round(percentUsed),
        threshold: 80,
        spent: categoryBudget.currentSpend,
        limit: categoryBudget.monthlyLimit
      });
    }
    
    // 100% threshold notification
    if (percentUsed >= 100 && !categoryBudget.notifiedAt100Percent) {
      categoryBudget.notifiedAt100Percent = true;
      categoryBudget.lastNotificationAt = new Date();
      
      // Queue notification
      await queueService.addJob('sendBudgetAlert', {
        userId,
        category,
        percentUsed: Math.round(percentUsed),
        threshold: 100,
        spent: categoryBudget.currentSpend,
        limit: categoryBudget.monthlyLimit
      });
    }
  }
  
  // Save updated budget
  await budgetConfig.save();
  return budgetConfig;
}

/**
 * Generate fallback insight when GPT is unavailable
 */
function generateFallbackInsight({itemName, price, isRecurring}) {
  if (isRecurring) {
    return `${itemName} appears to be a recurring purchase. Consider checking for bulk discounts or subscription options.`;
  }
  
  return `Item: ${itemName} - ${price}`;
}

/**
 * Get all insights for a user
 */
exports.getUserInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, offset = 0 } = req.query;
    
    const insights = await InsightItem.find({ userId })
      .sort({ dateDetected: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
      
    const total = await InsightItem.countDocuments({ userId });
    
    res.json({
      insights,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching user insights:', error);
    res.status(500).json({
      message: 'Failed to fetch insights',
      error: error.message
    });
  }
};

/**
 * Get insights for a specific receipt
 */
exports.getReceiptInsights = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = req.user._id;
    
    // Verify receipt belongs to user
    const receipt = await Receipt.findOne({ _id: receiptId, userId });
    
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }
    
    const insights = await InsightItem.find({ receiptId, userId });
    
    res.json({
      receipt,
      insights,
      insightStatus: receipt.insightProcessingStatus
    });
  } catch (error) {
    console.error('Error fetching receipt insights:', error);
    res.status(500).json({
      message: 'Failed to fetch receipt insights',
      error: error.message
    });
  }
};

module.exports = exports;